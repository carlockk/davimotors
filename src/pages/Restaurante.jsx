import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  actualizarEstadoComandaRestaurante,
  actualizarEstadoMesaRestaurante,
  cobrarComandaEnMesa,
  crearComandaRestaurante,
  crearMesaRestaurante,
  editarComandaRestaurante,
  editarMesaRestaurante,
  eliminarComandaRestaurante,
  eliminarMesaRestaurante,
  enviarComandaACaja,
  liberarMesaRestaurante,
  obtenerComandasRestaurante,
  obtenerMeserosRestaurante,
  obtenerMesasRestaurante,
  obtenerProductosRestaurante,
  tomarMesaRestaurante,
  transferirMesaRestaurante
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModalPago from '../components/ModalPago';

const ESTADOS_MESA = ['libre', 'ocupada', 'reservada', 'inactiva'];
const ESTADOS_COMANDA = ['abierta', 'en_preparacion', 'lista', 'entregada', 'lista_para_cobro', 'cerrada', 'cancelada'];

const labelEstadoMesa = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  inactiva: 'Inactiva'
};

const labelEstadoComanda = {
  abierta: 'Abierta',
  en_preparacion: 'En preparación',
  lista: 'Lista',
  entregada: 'Entregada',
  lista_para_cobro: 'Lista para cobro',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada'
};

const TINT_BY_STATE = {
  libre: 'rgba(16,185,129,0.35)',
  ocupada: 'rgba(239,68,68,0.35)',
  reservada: 'rgba(245,158,11,0.35)',
  inactiva: 'rgba(100,116,139,0.45)'
};

const MESA_COLORS = [
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
  '#84cc16',
  '#ec4899'
];

const hashTexto = (value) => {
  const str = String(value || '');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const colorMesa = (mesa) => {
  const seed = mesa?._id || mesa?.numero || Math.random().toString();
  return MESA_COLORS[hashTexto(seed) % MESA_COLORS.length];
};

const tintMesa = (estado) => TINT_BY_STATE[estado] || 'rgba(15,23,42,0.3)';

export default function Restaurante() {
  const { usuario, selectedLocal } = useAuth();
  const [mesas, setMesas] = useState([]);
  const [comandas, setComandas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [meseros, setMeseros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openMesaDialog, setOpenMesaDialog] = useState(false);
  const [openEditarMesaDialog, setOpenEditarMesaDialog] = useState(false);
  const [openComandaDialog, setOpenComandaDialog] = useState(false);
  const [openEditarComandaDialog, setOpenEditarComandaDialog] = useState(false);
  const [openCobroMesaDialog, setOpenCobroMesaDialog] = useState(false);
  const [openTransferirMesaDialog, setOpenTransferirMesaDialog] = useState(false);
  const [comandaCobroMesa, setComandaCobroMesa] = useState(null);
  const [transferirMesaForm, setTransferirMesaForm] = useState({ mesaId: '', meseroId: '' });
  const [mesaAccion, setMesaAccion] = useState({});

  const [mesaForm, setMesaForm] = useState({
    numero: '',
    nombre: '',
    zona: '',
    capacidad: 4
  });

  const [comandaForm, setComandaForm] = useState({
    mesaId: '',
    observacion: '',
    items: [{ productoId: '', cantidad: 1, nota: '' }]
  });
  const [editMesaForm, setEditMesaForm] = useState({
    id: '',
    numero: '',
    nombre: '',
    zona: '',
    capacidad: 4,
    estado: 'libre',
    meseroAsignado: ''
  });
  const [editComandaForm, setEditComandaForm] = useState({
    id: '',
    mesaId: '',
    estado: 'abierta',
    observacion: ''
  });

  const esAdmin = usuario?.rol === 'admin' || usuario?.rol === 'superadmin';
  const esCajero = usuario?.rol === 'cajero';
  const esAdminOCajero = esAdmin || esCajero;
  const esMesero = usuario?.rol === 'mesero';
  const puedeEnviarCaja = esAdmin || usuario?.rol === 'mesero';
  const puedeCobrarEnMesa = esAdmin || usuario?.rol === 'mesero';

  const mesasDisponibles = useMemo(
    () => mesas.filter((mesa) => mesa.estado !== 'inactiva'),
    [mesas]
  );

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [resMesas, resComandas, resProductos] = await Promise.all([
        obtenerMesasRestaurante(),
        obtenerComandasRestaurante(),
        obtenerProductosRestaurante()
      ]);
      setMesas(resMesas.data || []);
      setComandas(resComandas.data || []);
      setProductos(resProductos.data || []);
      if (esAdminOCajero) {
        const resMeseros = await obtenerMeserosRestaurante();
        setMeseros(resMeseros.data || []);
      } else {
        setMeseros([]);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo cargar el modulo restaurante');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [selectedLocal?._id]);

  const crearMesa = async () => {
    try {
      await crearMesaRestaurante({
        numero: Number(mesaForm.numero),
        nombre: mesaForm.nombre,
        zona: mesaForm.zona,
        capacidad: Number(mesaForm.capacidad) || 4
      });
      setOpenMesaDialog(false);
      setMesaForm({ numero: '', nombre: '', zona: '', capacidad: 4 });
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo crear la mesa');
    }
  };

  const abrirEditorMesa = (mesa) => {
    setEditMesaForm({
      id: mesa._id,
      numero: mesa.numero ?? '',
      nombre: mesa.nombre || '',
      zona: mesa.zona || '',
      capacidad: mesa.capacidad || 4,
      estado: mesa.estado || 'libre',
      meseroAsignado:
        typeof mesa?.meseroAsignado === 'string'
          ? mesa.meseroAsignado
          : mesa?.meseroAsignado?._id || ''
    });
    setOpenEditarMesaDialog(true);
  };

  const guardarEdicionMesa = async () => {
    try {
      await editarMesaRestaurante(editMesaForm.id, {
        numero: Number(editMesaForm.numero),
        nombre: editMesaForm.nombre,
        zona: editMesaForm.zona,
        capacidad: Number(editMesaForm.capacidad),
        estado: editMesaForm.estado,
        meseroAsignado: esAdminOCajero ? (editMesaForm.meseroAsignado || null) : undefined
      });
      setOpenEditarMesaDialog(false);
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo editar la mesa');
    }
  };

  const eliminarMesa = async (mesaId) => {
    const ok = window.confirm('¿Seguro que deseas eliminar esta mesa?');
    if (!ok) return;
    try {
      await eliminarMesaRestaurante(mesaId);
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo eliminar la mesa');
    }
  };

  const tomarMesa = async (mesaId) => {
    try {
      await tomarMesaRestaurante(mesaId);
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo tomar la mesa');
    }
  };

  const liberarMesa = async (mesaId) => {
    try {
      await liberarMesaRestaurante(mesaId);
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo liberar la mesa');
    }
  };

  const abrirTransferirMesa = (mesa) => {
    const meseroIdActual =
      typeof mesa?.meseroAsignado === 'string'
        ? mesa.meseroAsignado
        : mesa?.meseroAsignado?._id || '';

    setTransferirMesaForm({
      mesaId: mesa._id,
      meseroId: meseroIdActual
    });
    setOpenTransferirMesaDialog(true);
  };

  const confirmarTransferenciaMesa = async () => {
    if (!transferirMesaForm?.mesaId) return;
    if (!transferirMesaForm?.meseroId) {
      setError('Selecciona un mesero para transferir la mesa');
      return;
    }
    try {
      await transferirMesaRestaurante(transferirMesaForm.mesaId, { meseroId: transferirMesaForm.meseroId });
      setOpenTransferirMesaDialog(false);
      setTransferirMesaForm({ mesaId: '', meseroId: '' });
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo transferir la mesa');
    }
  };

  const ejecutarAccionMesa = (mesa, accion) => {
    if (!accion) return;
    if (accion === 'tomar') {
      tomarMesa(mesa._id);
    } else if (accion === 'transferir') {
      abrirTransferirMesa(mesa);
    } else if (accion === 'editar') {
      abrirEditorMesa(mesa);
    } else if (accion === 'liberar') {
      liberarMesa(mesa._id);
    } else if (accion === 'eliminar') {
      eliminarMesa(mesa._id);
    }

    setMesaAccion((prev) => ({ ...prev, [mesa._id]: '' }));
  };

  const actualizarEstadoMesa = async (mesaId, estado) => {
    try {
      await actualizarEstadoMesaRestaurante(mesaId, { estado });
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo actualizar la mesa');
    }
  };

  const actualizarEstadoComanda = async (comandaId, estado) => {
    try {
      await actualizarEstadoComandaRestaurante(comandaId, { estado });
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo actualizar la comanda');
    }
  };

  const addComandaItemRow = () => {
    setComandaForm((prev) => ({
      ...prev,
      items: [...prev.items, { productoId: '', cantidad: 1, nota: '' }]
    }));
  };

  const updateComandaItem = (index, field, value) => {
    setComandaForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    }));
  };

  const removeComandaItem = (index) => {
    setComandaForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const crearComanda = async () => {
    try {
      const itemsLimpios = comandaForm.items
        .map((item) => ({
          productoId: item.productoId,
          cantidad: Number(item.cantidad),
          nota: item.nota
        }))
        .filter((item) => item.productoId && Number.isFinite(item.cantidad) && item.cantidad > 0);

      await crearComandaRestaurante({
        mesaId: comandaForm.mesaId,
        observacion: comandaForm.observacion,
        items: itemsLimpios
      });
      setOpenComandaDialog(false);
      setComandaForm({
        mesaId: '',
        observacion: '',
        items: [{ productoId: '', cantidad: 1, nota: '' }]
      });
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo crear la comanda');
    }
  };

  const abrirEditorComanda = (comanda) => {
    setEditComandaForm({
      id: comanda._id,
      mesaId: comanda?.mesa?._id || '',
      estado: comanda.estado || 'abierta',
      observacion: comanda.observacion || ''
    });
    setOpenEditarComandaDialog(true);
  };

  const guardarEdicionComanda = async () => {
    try {
      await editarComandaRestaurante(editComandaForm.id, {
        mesaId: editComandaForm.mesaId,
        estado: editComandaForm.estado,
        observacion: editComandaForm.observacion
      });
      setOpenEditarComandaDialog(false);
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo editar la comanda');
    }
  };

  const eliminarComanda = async (comandaId) => {
    const ok = window.confirm('¿Seguro que deseas eliminar esta comanda?');
    if (!ok) return;
    try {
      await eliminarComandaRestaurante(comandaId);
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo eliminar la comanda');
    }
  };

  const enviarCaja = async (comandaId) => {
    try {
      await enviarComandaACaja(comandaId);
      await cargarDatos();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo enviar la comanda a caja');
    }
  };

  const abrirCobroMesa = (comanda) => {
    setComandaCobroMesa(comanda);
    setOpenCobroMesaDialog(true);
  };

  const cobrarEnMesa = async ({ tipoPago, tipoPedido, montoRecibido, vuelto }) => {
    if (!comandaCobroMesa?._id) return;
    try {
      await cobrarComandaEnMesa(comandaCobroMesa._id, {
        tipo_pago: tipoPago,
        tipo_pedido: tipoPedido || `restaurante mesa ${comandaCobroMesa?.mesa?.numero || ''}`,
        cobrador_nombre: usuario?.nombre || usuario?.email || '',
        monto_recibido: montoRecibido,
        vuelto
      });
      setOpenCobroMesaDialog(false);
      setComandaCobroMesa(null);
      await cargarDatos();
      alert('Cobro en mesa registrado correctamente');
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo cobrar en mesa');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Cargando modulo restaurante...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={2} gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Restaurante</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestion de mesas y comandas sin afectar el POS actual.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setOpenMesaDialog(true)}>+ Mesa</Button>
          <Button variant="contained" onClick={() => setOpenComandaDialog(true)}>+ Comanda</Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {mesas.length === 0 && comandas.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No hay contenido a mostrar para este local.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {mesas.map((mesa) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={mesa._id}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                minHeight: 210,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#fff',
                background: `
                  linear-gradient(160deg, ${colorMesa(mesa)} 0%, rgba(15,23,42,0.9) 130%),
                  linear-gradient(160deg, ${tintMesa(mesa.estado)} 0%, rgba(0,0,0,0.08) 100%)
                `,
                backgroundBlendMode: 'overlay, normal',
                boxShadow: mesa.estado === 'ocupada'
                  ? '0 12px 28px rgba(127,29,29,0.35)'
                  : '0 10px 24px rgba(2,6,23,0.28)',
                border: mesa.estado === 'inactiva'
                  ? '1px dashed rgba(255,255,255,0.45)'
                  : '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <Box>
                <Box
                  sx={{
                    display: 'inline-flex',
                    px: 1,
                    py: 0.3,
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(2px)'
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, letterSpacing: 0.5 }}>
                    {labelEstadoMesa[mesa.estado] || mesa.estado}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 0.75 }}>
                  <Typography sx={{ fontSize: 52, fontWeight: 900, lineHeight: 1 }}>
                    {mesa.numero}
                  </Typography>
                  <Box sx={{ ml: 1.25, textAlign: 'left' }}>
                    <Typography variant="caption" sx={{ opacity: 0.95, display: 'block' }}>
                      Mesa {mesa.numero}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ opacity: 0.9 }}>
                      Zona: {mesa.zona || 'Central'}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ opacity: 0.9 }}>
                      Capacidad: {mesa.capacidad || 4}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ opacity: 0.9 }}>
                      Mesero: {mesa?.meseroAsignado?.nombre || mesa?.meseroAsignado?.email || 'Sin asignar'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box mt={1.5}>
                <Stack spacing={1}>
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ color: '#fff' }}>Estado</InputLabel>
                  <Select
                    label="Estado"
                    value={mesa.estado}
                    onChange={(e) => actualizarEstadoMesa(mesa._id, e.target.value)}
                    sx={{
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.12)',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.45)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.7)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
                      '.MuiSvgIcon-root': { color: '#fff' }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: { bgcolor: '#111827', color: '#fff', maxHeight: 320 }
                      }
                    }}
                  >
                    {ESTADOS_MESA.map((estado) => (
                      <MenuItem key={estado} value={estado}>
                        {labelEstadoMesa[estado] || estado}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ color: '#fff' }}>Acción</InputLabel>
                  <Select
                    label="Acción"
                    value={mesaAccion[mesa._id] || ''}
                    onChange={(e) => {
                      const accion = e.target.value;
                      setMesaAccion((prev) => ({ ...prev, [mesa._id]: accion }));
                      ejecutarAccionMesa(mesa, accion);
                    }}
                    sx={{
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.12)',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.45)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.7)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
                      '.MuiSvgIcon-root': { color: '#fff' }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: { bgcolor: '#111827', color: '#fff', maxHeight: 320 }
                      }
                    }}
                  >
                    {esMesero && mesa.estado === 'libre' && !mesa?.meseroAsignado && (
                      <MenuItem value="tomar">Tomar mesa</MenuItem>
                    )}
                    {esAdminOCajero && <MenuItem value="transferir">Transferir</MenuItem>}
                    {esAdminOCajero && <MenuItem value="editar">Editar</MenuItem>}
                    {esAdminOCajero && <MenuItem value="liberar">Liberar</MenuItem>}
                    {esAdminOCajero && <MenuItem value="eliminar">Eliminar</MenuItem>}
                  </Select>
                </FormControl>
                </Stack>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={1}>Comandas</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Mesa</TableCell>
                <TableCell>Mesero</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Estado</TableCell>
                {(esAdmin || puedeEnviarCaja) && <TableCell>Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {comandas.map((comanda) => (
                <TableRow key={comanda._id}>
                  <TableCell>
                    Mesa {comanda.mesa?.numero || '-'}
                  </TableCell>
                  <TableCell>{comanda.mesero?.nombre || comanda.mesero?.email || 'Sin asignar'}</TableCell>
                  <TableCell>{Array.isArray(comanda.items) ? comanda.items.length : 0}</TableCell>
                  <TableCell>${Number(comanda.total || 0).toLocaleString('es-CL')}</TableCell>
                  <TableCell width={220}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={comanda.estado}
                        onChange={(e) => actualizarEstadoComanda(comanda._id, e.target.value)}
                      >
                        {ESTADOS_COMANDA.map((estado) => (
                          <MenuItem key={estado} value={estado}>
                            {labelEstadoComanda[estado] || estado}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  {(esAdmin || puedeEnviarCaja) && (
                    <TableCell width={220}>
                      <Stack direction="row" spacing={1}>
                        {comanda.estado !== 'lista_para_cobro' && comanda.estado !== 'cerrada' && comanda.estado !== 'cancelada' && (
                          <Button size="small" variant="contained" onClick={() => enviarCaja(comanda._id)}>
                            Enviar a Caja
                          </Button>
                        )}
                        {puedeCobrarEnMesa && comanda.estado !== 'cerrada' && comanda.estado !== 'cancelada' && (
                          <Button size="small" color="success" variant="contained" onClick={() => abrirCobroMesa(comanda)}>
                            Cobrar en Mesa
                          </Button>
                        )}
                        {esAdmin && (
                          <>
                            <Button size="small" variant="outlined" onClick={() => abrirEditorComanda(comanda)}>
                              Editar
                            </Button>
                            <Button size="small" color="error" variant="outlined" onClick={() => eliminarComanda(comanda._id)}>
                              Eliminar
                            </Button>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openMesaDialog} onClose={() => setOpenMesaDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nueva Mesa</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Numero"
              type="number"
              value={mesaForm.numero}
              onChange={(e) => setMesaForm((prev) => ({ ...prev, numero: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Nombre (opcional)"
              value={mesaForm.nombre}
              onChange={(e) => setMesaForm((prev) => ({ ...prev, nombre: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Zona (opcional)"
              value={mesaForm.zona}
              onChange={(e) => setMesaForm((prev) => ({ ...prev, zona: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Capacidad"
              type="number"
              value={mesaForm.capacidad}
              onChange={(e) => setMesaForm((prev) => ({ ...prev, capacidad: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMesaDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={crearMesa}>Crear</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openComandaDialog} onClose={() => setOpenComandaDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>Nueva Comanda</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Mesa</InputLabel>
              <Select
                label="Mesa"
                value={comandaForm.mesaId}
                onChange={(e) => setComandaForm((prev) => ({ ...prev, mesaId: e.target.value }))}
              >
                {mesasDisponibles.map((mesa) => (
                  <MenuItem key={mesa._id} value={mesa._id}>
                    Mesa {mesa.numero} ({labelEstadoMesa[mesa.estado] || mesa.estado})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Observacion"
              value={comandaForm.observacion}
              onChange={(e) => setComandaForm((prev) => ({ ...prev, observacion: e.target.value }))}
              fullWidth
            />

            {comandaForm.items.map((item, idx) => (
              <Grid container spacing={1} key={`item-${idx}`} alignItems="center">
                <Grid item xs={12} md={7}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Producto</InputLabel>
                    <Select
                      label="Producto"
                      value={item.productoId}
                      onChange={(e) => updateComandaItem(idx, 'productoId', e.target.value)}
                    >
                      {productos.map((producto) => (
                        <MenuItem key={producto._id} value={producto._id}>
                          {producto.nombre} - ${Number(producto.precio || 0).toLocaleString('es-CL')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={1.5}>
                  <TextField
                    label="Cant."
                    type="number"
                    size="small"
                    value={item.cantidad}
                    onChange={(e) => updateComandaItem(idx, 'cantidad', e.target.value)}
                    fullWidth
                    inputProps={{ min: 1, max: 9999 }}
                  />
                </Grid>
                <Grid item xs={12} md={2.5}>
                  <TextField
                    label="Nota"
                    size="small"
                    value={item.nota}
                    onChange={(e) => updateComandaItem(idx, 'nota', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <Button color="error" onClick={() => removeComandaItem(idx)}>X</Button>
                </Grid>
              </Grid>
            ))}

            <Button variant="text" onClick={addComandaItemRow}>
              + Agregar item
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenComandaDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={crearComanda}>Crear</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditarMesaDialog} onClose={() => setOpenEditarMesaDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Editar Mesa</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Numero"
              type="number"
              value={editMesaForm.numero}
              onChange={(e) => setEditMesaForm((prev) => ({ ...prev, numero: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Nombre"
              value={editMesaForm.nombre}
              onChange={(e) => setEditMesaForm((prev) => ({ ...prev, nombre: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Zona"
              value={editMesaForm.zona}
              onChange={(e) => setEditMesaForm((prev) => ({ ...prev, zona: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Capacidad"
              type="number"
              value={editMesaForm.capacidad}
              onChange={(e) => setEditMesaForm((prev) => ({ ...prev, capacidad: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                label="Estado"
                value={editMesaForm.estado}
                onChange={(e) => setEditMesaForm((prev) => ({ ...prev, estado: e.target.value }))}
              >
                {ESTADOS_MESA.map((estado) => (
                  <MenuItem key={estado} value={estado}>
                    {labelEstadoMesa[estado] || estado}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {esAdminOCajero && (
              <FormControl fullWidth size="small">
                <InputLabel>Mesero asignado</InputLabel>
                <Select
                  label="Mesero asignado"
                  value={editMesaForm.meseroAsignado}
                  onChange={(e) => setEditMesaForm((prev) => ({ ...prev, meseroAsignado: e.target.value }))}
                >
                  <MenuItem value="">Sin asignar</MenuItem>
                  {meseros.map((mesero) => (
                    <MenuItem key={mesero._id} value={mesero._id}>
                      {mesero.nombre || mesero.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditarMesaDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarEdicionMesa}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditarComandaDialog} onClose={() => setOpenEditarComandaDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Editar Comanda</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Mesa</InputLabel>
              <Select
                label="Mesa"
                value={editComandaForm.mesaId}
                onChange={(e) => setEditComandaForm((prev) => ({ ...prev, mesaId: e.target.value }))}
              >
                {mesasDisponibles.map((mesa) => (
                  <MenuItem key={mesa._id} value={mesa._id}>
                    Mesa {mesa.numero}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                label="Estado"
                value={editComandaForm.estado}
                onChange={(e) => setEditComandaForm((prev) => ({ ...prev, estado: e.target.value }))}
              >
                {ESTADOS_COMANDA.map((estado) => (
                  <MenuItem key={estado} value={estado}>
                    {labelEstadoComanda[estado] || estado}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Observacion"
              value={editComandaForm.observacion}
              onChange={(e) => setEditComandaForm((prev) => ({ ...prev, observacion: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditarComandaDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarEdicionComanda}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <ModalPago
        open={openCobroMesaDialog}
        onClose={() => {
          setOpenCobroMesaDialog(false);
          setComandaCobroMesa(null);
        }}
        onSubmit={cobrarEnMesa}
        total={Number(comandaCobroMesa?.total || 0)}
      />

      <Dialog
        open={openTransferirMesaDialog}
        onClose={() => setOpenTransferirMesaDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Transferir Mesa</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Mesero destino</InputLabel>
            <Select
              label="Mesero destino"
              value={transferirMesaForm.meseroId}
              onChange={(e) => setTransferirMesaForm((prev) => ({ ...prev, meseroId: e.target.value }))}
            >
              {meseros.map((mesero) => (
                <MenuItem key={mesero._id} value={mesero._id}>
                  {mesero.nombre || mesero.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTransferirMesaDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarTransferenciaMesa}>Transferir</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
