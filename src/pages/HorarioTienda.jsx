import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { guardarConfigSocial, obtenerConfigSocial } from '../services/api';
import { useAuth } from '../context/AuthContext';

const REDES = ['facebook', 'instagram', 'tiktok', 'youtube', 'x', 'whatsapp'];
const DIAS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' }
];

const buildEmptySchedule = () =>
  DIAS.reduce((acc, day) => {
    acc[day.value] = [];
    return acc;
  }, {});

const buildScheduleFromApi = (raw) => {
  const base = buildEmptySchedule();
  if (!Array.isArray(raw)) return base;
  raw.forEach((entry) => {
    const dia = Number(entry?.dia);
    if (!Object.prototype.hasOwnProperty.call(base, dia)) return;
    const tramos = Array.isArray(entry?.tramos) ? entry.tramos : [];
    base[dia] = tramos
      .map((slot) => ({
        inicio: String(slot?.inicio || ''),
        fin: String(slot?.fin || '')
      }))
      .filter((slot) => slot.inicio && slot.fin);
  });
  return base;
};

const buildSchedulePayload = (scheduleByDay) =>
  DIAS.map((day) => ({
    dia: day.value,
    tramos: Array.isArray(scheduleByDay?.[day.value]) ? scheduleByDay[day.value] : []
  })).filter((entry) => entry.tramos.length > 0);

const buildSocialsFromConfig = (data) =>
  REDES.reduce((acc, key) => {
    const entry = data?.[key] || data?.socials?.[key] || {};
    acc[key] = {
      enabled: Boolean(entry.enabled),
      url: entry.url || ''
    };
    return acc;
  }, {});

export default function HorarioTienda() {
  const { usuario, selectedLocal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [horariosWeb, setHorariosWeb] = useState(buildEmptySchedule());
  const [socials, setSocials] = useState({});

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError('');
      setInfo('');
      setHorariosWeb(buildEmptySchedule());

      if (usuario?.rol === 'superadmin' && !selectedLocal?._id) {
        setLoading(false);
        return;
      }

      try {
        const res = await obtenerConfigSocial();
        const data = res?.data || {};
        setHorariosWeb(buildScheduleFromApi(data?.horarios_web));
        setSocials(buildSocialsFromConfig(data));
      } catch (err) {
        setError('No se pudo cargar el horario de la tienda.');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [selectedLocal?._id, usuario?.rol]);

  const agregarTramo = (dia) => {
    setHorariosWeb((prev) => ({
      ...prev,
      [dia]: [...(prev[dia] || []), { inicio: '09:00', fin: '18:00' }]
    }));
  };

  const actualizarTramo = (dia, index, key, value) => {
    setHorariosWeb((prev) => ({
      ...prev,
      [dia]: (prev[dia] || []).map((slot, idx) => (idx === index ? { ...slot, [key]: value } : slot))
    }));
  };

  const eliminarTramo = (dia, index) => {
    setHorariosWeb((prev) => ({
      ...prev,
      [dia]: (prev[dia] || []).filter((_, idx) => idx !== index)
    }));
  };

  const guardar = async () => {
    setSaving(true);
    setError('');
    setInfo('');
    try {
      await guardarConfigSocial({
        socials,
        horarios_web: buildSchedulePayload(horariosWeb)
      });
      setInfo('Horario de la tienda guardado.');
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo guardar el horario de la tienda.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Typography sx={{ mt: 4 }}>Cargando horario de la tienda...</Typography>;
  }

  return (
    <Box sx={{ mt: 4, px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          maxWidth: 760,
          backgroundColor: 'transparent',
          boxShadow: 'none'
        }}
      >
        <Typography variant="h5" gutterBottom>Horario de la tienda</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Define los horarios de atencion para pedidos web. Fuera de horario, el cliente no podra avanzar al pago.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

        <Stack spacing={2}>
          {DIAS.map((day) => {
            const slots = horariosWeb?.[day.value] || [];
            return (
              <Paper key={day.value} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {day.label}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddCircleOutlineIcon />}
                      onClick={() => agregarTramo(day.value)}
                    >
                      Agregar tramo
                    </Button>
                  </Stack>

                  {slots.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Sin atencion configurada para este dia.
                    </Typography>
                  ) : (
                    slots.map((slot, idx) => (
                      <Stack key={`${day.value}-${idx}`} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                        <TextField
                          size="small"
                          type="time"
                          label="Inicio"
                          value={slot.inicio}
                          onChange={(e) => actualizarTramo(day.value, idx, 'inicio', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          size="small"
                          type="time"
                          label="Fin"
                          value={slot.fin}
                          onChange={(e) => actualizarTramo(day.value, idx, 'fin', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                        <IconButton color="error" onClick={() => eliminarTramo(day.value, idx)}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Stack>
                    ))
                  )}
                </Stack>
              </Paper>
            );
          })}

          <Stack direction="row" justifyContent="flex-end">
            <Button variant="contained" onClick={guardar} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar horario'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
