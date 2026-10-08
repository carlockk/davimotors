import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UndoIcon from "@mui/icons-material/Undo";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const normalizePoint = (raw) => {
  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const buildZoneDraft = (zone, index = 0) => ({
  id: zone?.id || `${Date.now()}-${index}`,
  name: zone?.name || `Zona ${index + 1}`,
  color: zone?.color || "#2563eb",
  active: zone?.active !== false,
  priority: Number.isFinite(Number(zone?.priority)) ? Number(zone.priority) : index,
  polygon: Array.isArray(zone?.polygon) ? zone.polygon.map(normalizePoint).filter(Boolean) : [],
});

const createEmptyZone = (zones = []) =>
  buildZoneDraft(
    {
      name: `Zona ${zones.length + 1}`,
      active: true,
      priority: zones.length,
      polygon: [],
    },
    zones.length
  );

export default function DeliveryZonesEditor({
  open,
  onClose,
  zones = [],
  onChange,
}) {
  const [localZones, setLocalZones] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState("");

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const polygonRef = useRef(null);
  const previewPolylineRef = useRef(null);
  const markersRef = useRef([]);
  const clickListenerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const nextZones = (Array.isArray(zones) ? zones : []).map((zone, index) => buildZoneDraft(zone, index));
    setLocalZones(nextZones);
    setSelectedIndex(nextZones.length > 0 ? 0 : -1);
  }, [open, zones]);

  useEffect(() => {
    if (!open || !GOOGLE_MAPS_API_KEY) return;

    const setup = () => {
      if (!window.google?.maps) return false;
      setMapsReady(true);
      setMapsError("");
      return true;
    };

    if (setup()) return undefined;

    const existingScript = document.querySelector('script[data-google-maps="delivery-zones-editor"]');
    const handleLoad = () => {
      if (!setup()) setMapsError("No se pudo inicializar Google Maps.");
    };
    const handleError = () => setMapsError("No se pudo cargar Google Maps.");

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
      return () => {
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
      };
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-google-maps", "delivery-zones-editor");
    script.onload = handleLoad;
    script.onerror = handleError;
    document.head.appendChild(script);
    return undefined;
  }, [open]);

  const selectedZone = selectedIndex >= 0 ? localZones[selectedIndex] : null;

  const currentCenter = useMemo(() => {
    if (selectedZone?.polygon?.[0]) return selectedZone.polygon[0];
    return { lat: -33.4489, lng: -70.6693 };
  }, [selectedZone]);

  const syncMapShape = () => {
    if (!window.google?.maps || !mapRef.current) return;

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    if (previewPolylineRef.current) {
      previewPolylineRef.current.setMap(null);
      previewPolylineRef.current = null;
    }
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (!selectedZone) return;

    const path = (selectedZone.polygon || []).map((point) => ({ lat: point.lat, lng: point.lng }));
    const strokeColor = selectedZone.color || "#2563eb";

    if (path.length >= 3) {
      polygonRef.current = new window.google.maps.Polygon({
        paths: path,
        strokeColor,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: strokeColor,
        fillOpacity: 0.2,
        map: mapRef.current,
      });
    } else if (path.length >= 2) {
      previewPolylineRef.current = new window.google.maps.Polyline({
        path,
        strokeColor,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        map: mapRef.current,
      });
    }

    markersRef.current = path.map((point, index) => {
      const marker = new window.google.maps.Marker({
        position: point,
        map: mapRef.current,
        draggable: true,
        label: `${index + 1}`,
      });

      marker.addListener("dragend", (event) => {
        const lat = event.latLng?.lat();
        const lng = event.latLng?.lng();
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        setLocalZones((prev) =>
          prev.map((zone, zoneIndex) =>
            zoneIndex !== selectedIndex
              ? zone
              : {
                  ...zone,
                  polygon: zone.polygon.map((item, itemIndex) =>
                    itemIndex === index ? { lat, lng } : item
                  ),
                }
          )
        );
      });

      return marker;
    });

    if (path.length > 0) {
      mapRef.current.setCenter(path[0]);
      if (path.length === 1) {
        mapRef.current.setZoom(15);
      }
    }
  };

  useEffect(() => {
    if (!open || !mapsReady || !mapContainerRef.current || !window.google?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: currentCenter,
        zoom: selectedZone?.polygon?.length ? 15 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }

    if (clickListenerRef.current) {
      window.google.maps.event.removeListener(clickListenerRef.current);
    }

    clickListenerRef.current = mapRef.current.addListener("click", (event) => {
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || selectedIndex < 0) return;

      setLocalZones((prev) =>
        prev.map((zone, index) =>
          index !== selectedIndex
            ? zone
            : {
                ...zone,
                polygon: [...(zone.polygon || []), { lat, lng }],
              }
        )
      );
    });

    syncMapShape();

    return () => {
      if (clickListenerRef.current) {
        window.google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [open, mapsReady, currentCenter, selectedZone, selectedIndex]);

  useEffect(() => {
    syncMapShape();
  }, [selectedZone]);

  const updateSelectedZone = (patch) => {
    if (selectedIndex < 0) return;
    setLocalZones((prev) =>
      prev.map((zone, index) =>
        index === selectedIndex ? { ...zone, ...patch } : zone
      )
    );
  };

  const handleAddZone = () => {
    const next = createEmptyZone(localZones);
    setLocalZones((prev) => [...prev, next]);
    setSelectedIndex(localZones.length);
  };

  const handleDeleteZone = (index) => {
    const nextZones = localZones
      .filter((_, itemIndex) => itemIndex !== index)
      .map((zone, zoneIndex) => ({ ...zone, priority: zoneIndex }));
    setLocalZones(nextZones);
    setSelectedIndex((prev) => {
      if (prev === index) return nextZones.length ? Math.max(0, index - 1) : -1;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const handleRemoveLastPoint = () => {
    if (selectedIndex < 0) return;
    setLocalZones((prev) =>
      prev.map((zone, index) =>
        index !== selectedIndex
          ? zone
          : {
              ...zone,
              polygon: zone.polygon.slice(0, -1),
            }
      )
    );
  };

  const handleResetPolygon = () => {
    updateSelectedZone({ polygon: [] });
  };

  const handleSave = () => {
    const normalized = localZones
      .map((zone, index) => ({
        name: String(zone.name || "").trim() || `Zona ${index + 1}`,
        color: zone.color || "#2563eb",
        active: zone.active !== false,
        priority: index,
        polygon: Array.isArray(zone.polygon) ? zone.polygon.map(normalizePoint).filter(Boolean) : [],
      }))
      .filter((zone) => zone.polygon.length >= 3);

    onChange(normalized);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Zonas de delivery</DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1">Zonas del local</Typography>
              <Button size="small" startIcon={<AddLocationAltIcon />} onClick={handleAddZone}>
                Nueva zona
              </Button>
            </Stack>

            <List dense sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, minHeight: 180 }}>
              {localZones.length === 0 && (
                <ListItem>
                  <ListItemText primary="No hay zonas configuradas" secondary="Crea una zona y dibuja el poligono en el mapa." />
                </ListItem>
              )}
              {localZones.map((zone, index) => (
                <ListItem key={zone.id} disablePadding>
                  <ListItemButton selected={index === selectedIndex} onClick={() => setSelectedIndex(index)}>
                    <ListItemText
                      primary={zone.name || `Zona ${index + 1}`}
                      secondary={`${zone.polygon.length} puntos${zone.active === false ? " | inactiva" : ""}`}
                    />
                  </ListItemButton>
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => setSelectedIndex(index)} size="small">
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDeleteZone(index)} size="small" color="error">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            {selectedZone && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField
                  label="Nombre de la zona"
                  value={selectedZone.name}
                  onChange={(event) => updateSelectedZone({ name: event.target.value })}
                />
                <TextField
                  label="Color"
                  value={selectedZone.color}
                  onChange={(event) => updateSelectedZone({ color: event.target.value })}
                  helperText="Ej: #2563eb"
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Switch
                    checked={selectedZone.active !== false}
                    onChange={(event) => updateSelectedZone({ active: event.target.checked })}
                  />
                  <Typography variant="body2">Zona activa</Typography>
                  <Chip size="small" label={`${selectedZone.polygon.length} puntos`} />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UndoIcon />}
                    onClick={handleRemoveLastPoint}
                    disabled={selectedZone.polygon.length === 0}
                  >
                    Quitar ultimo punto
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    startIcon={<RestartAltIcon />}
                    onClick={handleResetPolygon}
                    disabled={selectedZone.polygon.length === 0}
                  >
                    Reiniciar
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Haz clic en el mapa para agregar puntos. Arrastra los marcadores para ajustar el borde.
                </Typography>
              </Stack>
            )}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />

          <Box sx={{ flex: 1 }}>
            {!GOOGLE_MAPS_API_KEY && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Falta configurar <code>VITE_GOOGLE_MAPS_API_KEY</code> en el front del POS para dibujar zonas.
              </Alert>
            )}
            {mapsError && <Alert severity="error" sx={{ mb: 2 }}>{mapsError}</Alert>}
            <Box
              sx={{
                height: 480,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                backgroundColor: "#f8fafc",
              }}
            >
              <Box ref={mapContainerRef} sx={{ width: "100%", height: "100%" }} />
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>
          Guardar zonas
        </Button>
      </DialogActions>
    </Dialog>
  );
}
