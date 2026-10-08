import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';

import { useAuth } from '../context/AuthContext';
import {
  obtenerLocales,
  crearLocal,
  editarLocal,
  eliminarLocal
} from '../services/api';
import DeliveryZonesEditor from '../components/DeliveryZonesEditor';

const emptyForm = {
  nombre: '',
  direccion: '',
  telefono: '',
  correo: '',
  servicios: {
    tienda: true,
    retiro: true,
    delivery: true,
  },
  pagos_web: {
    efectivo: true,
    tarjeta: true,
    transferencia: false,
    transferencia_datos: {
      nombre: '',
      rut: '',
      numero_cuenta: '',
      correo: '',
    },
  },
  delivery_zones: [],
};

export default function Locales() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'superadmin';

  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [zonesDialogOpen, setZonesDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const fetchLocales = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await obtenerLocales();
      setLocales(res.data || []);
    } catch (err) {
      setError('No se pudieron cargar los locales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocales();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
    setInfo('');
    setError('');
  };

  const openEdit = (local) => {
    setForm({
      nombre: local.nombre || '',
      direccion: local.direccion || '',
      telefono: local.telefono || '',
      correo: local.correo || '',
      servicios: {
        tienda: local?.servicios?.tienda !== false,
        retiro: local?.servicios?.retiro !== false,
        delivery: local?.servicios?.delivery !== false,
      },
      pagos_web: {
        efectivo: local?.pagos_web?.efectivo !== false,
        tarjeta: local?.pagos_web?.tarjeta !== false,
        transferencia: local?.pagos_web?.transferencia === true,
        transferencia_datos: {
          nombre: local?.pagos_web?.transferencia_datos?.nombre || '',
          rut: local?.pagos_web?.transferencia_datos?.rut || '',
          numero_cuenta: local?.pagos_web?.transferencia_datos?.numero_cuenta || '',
          correo: local?.pagos_web?.transferencia_datos?.correo || '',
        },
      },
      delivery_zones: Array.isArray(local?.delivery_zones) ? local.delivery_zones : [],
    });
    setEditingId(local._id);
    setDialogOpen(true);
    setInfo('');
    setError('');
  };

  const openZonesEditor = (local) => {
    openEdit(local);
    setZonesDialogOpen(true);
  };

  const handleSave = async () => {
    setError('');
    setInfo('');

    if (!form.nombre.trim()) {
      setError('Ingresa un nombre para el local.');
      return;
    }

    if (!Object.values(form.servicios || {}).some(Boolean)) {
      setError('Debes habilitar al menos un tipo de pedido.');
      return;
    }

    if (![
      Boolean(form.pagos_web?.efectivo),
      Boolean(form.pagos_web?.tarjeta),
      Boolean(form.pagos_web?.transferencia),
    ].some(Boolean)) {
      setError('Debes habilitar al menos un metodo de pago web.');
      return;
    }

    if (form.pagos_web?.transferencia) {
      const cuenta = form.pagos_web?.transferencia_datos || {};
      if (!cuenta.nombre?.trim() || !cuenta.rut?.trim() || !cuenta.numero_cuenta?.trim() || !cuenta.correo?.trim()) {
        setError('Completa los datos de la cuenta para habilitar transferencia.');
        return;
      }
    }

    const payload = {
      nombre: form.nombre.trim(),
      direccion: form.direccion.trim(),
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
      servicios: {
        tienda: Boolean(form.servicios?.tienda),
        retiro: Boolean(form.servicios?.retiro),
        delivery: Boolean(form.servicios?.delivery),
      },
      pagos_web: {
        efectivo: Boolean(form.pagos_web?.efectivo),
        tarjeta: Boolean(form.pagos_web?.tarjeta),
        transferencia: Boolean(form.pagos_web?.transferencia),
        transferencia_datos: {
          nombre: form.pagos_web?.transferencia_datos?.nombre?.trim() || '',
          rut: form.pagos_web?.transferencia_datos?.rut?.trim() || '',
          numero_cuenta: form.pagos_web?.transferencia_datos?.numero_cuenta?.trim() || '',
          correo: form.pagos_web?.transferencia_datos?.correo?.trim() || '',
        },
      },
      delivery_zones: Array.isArray(form.delivery_zones) ? form.delivery_zones : [],
    };

    try {
      setSaving(true);
      if (editingId) {
        await editarLocal(editingId, payload);
        setInfo('Local actualizado.');
      } else {
        await crearLocal(payload);
        setInfo('Local creado.');
      }
      setDialogOpen(false);
      setTransferDialogOpen(false);
      setZonesDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchLocales();
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudo guardar el local.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (local) => {
    setDeleteTarget(local);
    setError('');
    setInfo('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      await eliminarLocal(deleteTarget._id);
      setInfo('Local eliminado.');
      setDeleteTarget(null);
      fetchLocales();
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudo eliminar el local.';
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    setZonesDialogOpen(false);
    setTransferDialogOpen(false);
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
  };

  const updateServiceToggle = (key) => (event) => {
    const checked = event.target.checked;
    setForm((prev) => ({
      ...prev,
      servicios: {
        ...prev.servicios,
        [key]: checked,
      },
    }));
  };

  const updatePaymentToggle = (key) => (event) => {
    const checked = event.target.checked;
    setForm((prev) => ({
      ...prev,
      pagos_web: {
        ...prev.pagos_web,
        [key]: checked,
      },
    }));
  };

  return (
    <Box sx={{ mt: 4, px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: 'transparent',
          boxShadow: 'none',
          fontSize: '0.92rem',
          '& .MuiTypography-body1, & .MuiTypography-body2, & .MuiTypography-subtitle2': {
            fontSize: '0.92rem'
          },
          '& .MuiTableCell-root': { fontSize: '0.85rem' }
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h5" gutterBottom>
              Locales
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administra los locales disponibles en el sistema.
            </Typography>
          </Box>

          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
            >
              Crear nuevo local
            </Button>
          )}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}
        >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Direccion</TableCell>
                  <TableCell>Telefono</TableCell>
                  <TableCell>Correo</TableCell>
                  <TableCell>Canales web</TableCell>
                  <TableCell>Pagos web</TableCell>
                  {isAdmin && <TableCell align="right">Acciones</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {locales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} align="center">
                      No hay locales registrados.
                    </TableCell>
                  </TableRow>
                )}
                {locales.map((local) => (
                  <TableRow key={local._id}>
                    <TableCell>{local.nombre || '-'}</TableCell>
                    <TableCell>{local.direccion || '-'}</TableCell>
                    <TableCell>{local.telefono || '-'}</TableCell>
                    <TableCell>{local.correo || '-'}</TableCell>
                    <TableCell>
                      {[
                        local?.servicios?.tienda !== false ? 'Tienda' : null,
                        local?.servicios?.retiro !== false ? 'Retiro' : null,
                        local?.servicios?.delivery !== false ? 'Delivery' : null,
                      ].filter(Boolean).join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      {[
                        local?.pagos_web?.tarjeta !== false ? 'Tarjeta' : null,
                        local?.pagos_web?.efectivo !== false ? 'Efectivo' : null,
                        local?.pagos_web?.transferencia === true ? 'Transferencia' : null,
                      ].filter(Boolean).join(', ') || '-'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <IconButton onClick={() => openEdit(local)} size="small" sx={{ mr: 0.5 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => openZonesEditor(local)} size="small" sx={{ mr: 0.5 }}>
                          <RoomOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => confirmDelete(local)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingId ? 'Editar local' : 'Crear local'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              autoFocus
              required
            />
            <TextField
              label="Direccion"
              value={form.direccion}
              onChange={(e) => setForm((prev) => ({ ...prev, direccion: e.target.value }))}
            />
            <TextField
              label="Telefono"
              value={form.telefono}
              onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
            />
            <TextField
              label="Correo"
              value={form.correo}
              onChange={(e) => setForm((prev) => ({ ...prev, correo: e.target.value }))}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Tipos de pedido visibles en web
              </Typography>
              <Stack>
                <FormControlLabel
                  control={<Checkbox checked={Boolean(form.servicios?.tienda)} onChange={updateServiceToggle('tienda')} />}
                  label="Para consumir en tienda"
                />
                <FormControlLabel
                  control={<Checkbox checked={Boolean(form.servicios?.retiro)} onChange={updateServiceToggle('retiro')} />}
                  label="Retiro en tienda"
                />
                <FormControlLabel
                  control={<Checkbox checked={Boolean(form.servicios?.delivery)} onChange={updateServiceToggle('delivery')} />}
                  label="Delivery"
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Metodos de pago web
              </Typography>
              <Stack>
                <FormControlLabel
                  control={<Checkbox checked={Boolean(form.pagos_web?.tarjeta)} onChange={updatePaymentToggle('tarjeta')} />}
                  label="Tarjeta (Webpay)"
                />
                <FormControlLabel
                  control={<Checkbox checked={Boolean(form.pagos_web?.efectivo)} onChange={updatePaymentToggle('efectivo')} />}
                  label="Efectivo"
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={<Checkbox checked={Boolean(form.pagos_web?.transferencia)} onChange={updatePaymentToggle('transferencia')} />}
                    label="Transferencia bancaria"
                  />
                  <IconButton
                    size="small"
                    onClick={() => setTransferDialogOpen(true)}
                    aria-label="Editar datos de transferencia"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Stack>
                {form.pagos_web?.transferencia && (
                  <Typography variant="caption" color="text.secondary">
                    {form.pagos_web?.transferencia_datos?.nombre
                      ? `Cuenta configurada para ${form.pagos_web.transferencia_datos.nombre}`
                      : 'Faltan datos de la cuenta bancaria.'}
                  </Typography>
                )}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Zonas de delivery
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Button variant="outlined" onClick={() => setZonesDialogOpen(true)}>
                  Configurar zonas
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {Array.isArray(form.delivery_zones) && form.delivery_zones.length > 0
                    ? `${form.delivery_zones.length} zona(s) configurada(s)`
                    : 'Sin zonas configuradas. Si no agregas zonas, el delivery quedara sin restriccion geográfica.'}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar local</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Seguro que deseas eliminar el local "{deleteTarget?.nombre}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Datos para transferencia</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre titular"
              value={form.pagos_web?.transferencia_datos?.nombre || ''}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                pagos_web: {
                  ...prev.pagos_web,
                  transferencia_datos: {
                    ...prev.pagos_web.transferencia_datos,
                    nombre: e.target.value,
                  },
                },
              }))}
              autoFocus
            />
            <TextField
              label="RUT"
              value={form.pagos_web?.transferencia_datos?.rut || ''}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                pagos_web: {
                  ...prev.pagos_web,
                  transferencia_datos: {
                    ...prev.pagos_web.transferencia_datos,
                    rut: e.target.value,
                  },
                },
              }))}
            />
            <TextField
              label="Numero de cuenta"
              value={form.pagos_web?.transferencia_datos?.numero_cuenta || ''}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                pagos_web: {
                  ...prev.pagos_web,
                  transferencia_datos: {
                    ...prev.pagos_web.transferencia_datos,
                    numero_cuenta: e.target.value,
                  },
                },
              }))}
            />
            <TextField
              label="Correo de la cuenta"
              type="email"
              value={form.pagos_web?.transferencia_datos?.correo || ''}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                pagos_web: {
                  ...prev.pagos_web,
                  transferencia_datos: {
                    ...prev.pagos_web.transferencia_datos,
                    correo: e.target.value,
                  },
                },
              }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <DeliveryZonesEditor
        open={zonesDialogOpen}
        onClose={() => setZonesDialogOpen(false)}
        zones={form.delivery_zones}
        onChange={(nextZones) => setForm((prev) => ({ ...prev, delivery_zones: nextZones }))}
      />
    </Box>
  );
}
