import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Drawer,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import {
  actualizarEstadoPedidoWeb,
  asignarRepartidorPedidoWeb,
  crearEstadoPedidoWeb,
  editarEstadoPedidoWeb,
  eliminarEstadoPedidoWeb,
  eliminarPedidoWeb,
  guardarEstadosRepartidorPedidoWeb,
  obtenerRepartidoresPedidoWeb,
  obtenerEstadosRepartidorPedidoWeb,
  obtenerEstadosPedidoWeb,
  obtenerPedidosWeb
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const CERRADOS = new Set(['entregado', 'rechazado', 'cancelado']);
const ESTADOS_DEFAULT = ['pendiente', 'aceptado', 'preparando', 'listo', 'entregado', 'rechazado', 'cancelado'];

const getEstado = (pedido) =>
  String(pedido?.estado_pedido || pedido?.estado || pedido?.status || 'pendiente').toLowerCase();

const getClienteLabel = (pedido) => {
  const nombre = pedido?.cliente_nombre || '';
  const telefono = pedido?.cliente_telefono || '';
  if (nombre && telefono) return `${nombre} (${telefono})`;
  return nombre || telefono || 'Cliente sin datos';
};

const getLocalId = (selectedLocal, usuario) => {
  if (typeof selectedLocal === 'string') return selectedLocal;
  if (selectedLocal?._id) return selectedLocal._id;
  if (typeof usuario?.local === 'string') return usuario.local;
  if (usuario?.local?._id) return usuario.local._id;
  return '';
};

const getPedidoDate = (pedido) =>
  new Date(pedido?.fecha || pedido?.createdAt || pedido?.updatedAt || 0).getTime();

const esPedidoDelivery = (pedido) => {
  const tipo = String(pedido?.tipo_pedido || '').toLowerCase();
  if (tipo === 'delivery' || tipo === 'domicilio') return true;
  return Array.isArray(pedido?.productos) && pedido.productos.some((prod) =>
    String(prod?.observacion || '').toLowerCase().includes('delivery:')
  );
};

const getTipoPedidoLabel = (pedido) => {
  const tipo = String(pedido?.tipo_pedido || '').toLowerCase();
  if (tipo === 'delivery' || tipo === 'domicilio') return 'delivery';
  if (tipo === 'retiro') {
    const hora = String(pedido?.hora_retiro || '').trim();
    return hora ? `retiro (${hora})` : 'retiro';
  }
  return tipo || 'tienda';
};

export default function PedidosWeb() {
  const { usuario, selectedLocal } = useAuth();
  const location = useLocation();

  const [tab, setTab] = useState('abiertos');
  const [pedidos, setPedidos] = useState([]);
  const [estados, setEstados] = useState(ESTADOS_DEFAULT);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [loading, setLoading] = useState(false);
  const [repartidores, setRepartidores] = useState([]);
  const [asignandoRepartidorId, setAsignandoRepartidorId] = useState('');
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [estadoEdicion, setEstadoEdicion] = useState('pendiente');
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [creandoEstado, setCreandoEstado] = useState(false);
  const [guardandoEstadosRepartidor, setGuardandoEstadosRepartidor] = useState(false);
  const [estadosRepartidor, setEstadosRepartidor] = useState([]);
  const [estadoEditando, setEstadoEditando] = useState('');
  const [estadoNuevoValor, setEstadoNuevoValor] = useState('');
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [eliminandoEstado, setEliminandoEstado] = useState('');
  const [eliminandoPedido, setEliminandoPedido] = useState(false);

  const localId = useMemo(() => getLocalId(selectedLocal, usuario), [selectedLocal, usuario]);
  const puedeGestionar = ['admin', 'superadmin', 'cajero'].includes(usuario?.rol || '');
  const puedeCrearEstados = ['admin', 'superadmin'].includes(usuario?.rol || '');
  const puedeEliminarPedidos = ['admin', 'superadmin'].includes(usuario?.rol || '');
  const puedeAsignarRepartidor = ['admin', 'superadmin', 'cajero'].includes(usuario?.rol || '');

  const cargarPedidos = async () => {
    if (!localId) {
      setPedidos([]);
      return;
    }

    setLoading(true);
    try {
      const res = await obtenerPedidosWeb();
      const data = Array.isArray(res.data) ? res.data : [];
      data.sort((a, b) => getPedidoDate(b) - getPedidoDate(a));
      setPedidos(data);
    } catch {
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstados = async () => {
    if (!localId) {
      setEstados(ESTADOS_DEFAULT);
      return;
    }
    try {
      const res = await obtenerEstadosPedidoWeb();
      const data = Array.isArray(res?.data?.estados) ? res.data.estados : ESTADOS_DEFAULT;
      setEstados(data.length > 0 ? data : ESTADOS_DEFAULT);
    } catch {
      setEstados(ESTADOS_DEFAULT);
    }
  };

  const cargarEstadosRepartidor = async () => {
    if (!localId) {
      setEstadosRepartidor([]);
      return;
    }
    try {
      const res = await obtenerEstadosRepartidorPedidoWeb();
      const data = Array.isArray(res?.data?.estados) ? res.data.estados : [];
      setEstadosRepartidor(data.map((item) => String(item).toLowerCase()));
    } catch {
      setEstadosRepartidor([]);
    }
  };

  const cargarRepartidores = async () => {
    if (!localId) {
      setRepartidores([]);
      return;
    }
    try {
      const res = await obtenerRepartidoresPedidoWeb();
      setRepartidores(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setRepartidores([]);
    }
  };

  useEffect(() => {
    cargarPedidos();
    cargarEstados();
    cargarEstadosRepartidor();
    cargarRepartidores();
  }, [localId]);

  useEffect(() => {
    const focusId = location.state?.focusPedidoId;
    if (!focusId || pedidos.length === 0) return;
    const found = pedidos.find((p) => p._id === focusId);
    if (found) {
      setPedidoActivo(found);
      setEstadoEdicion(getEstado(found));
    }
  }, [location.state, pedidos]);

  useEffect(() => {
    if (!localId) return undefined;
    const interval = setInterval(() => {
      cargarPedidos();
    }, 15000);
    return () => clearInterval(interval);
  }, [localId]);

  const pedidosFiltrados = useMemo(() => {
    if (tab === 'abiertos') {
      return pedidos.filter((p) => !CERRADOS.has(getEstado(p)));
    }
    return pedidos.filter((p) => CERRADOS.has(getEstado(p)));
  }, [pedidos, tab]);

  const estadosSelect = useMemo(() => {
    const fromApi = Array.isArray(estados) ? estados : [];
    const fromPedido = pedidoActivo ? [getEstado(pedidoActivo)] : [];
    return Array.from(new Set([...ESTADOS_DEFAULT, ...fromApi, ...fromPedido]));
  }, [estados, pedidoActivo]);

  const guardarEstado = async () => {
    if (!pedidoActivo?._id || !puedeGestionar) return;
    setGuardandoEstado(true);
    try {
      const res = await actualizarEstadoPedidoWeb(pedidoActivo._id, { estado: estadoEdicion });
      const actualizado = res.data;
      setPedidos((prev) => prev.map((p) => (p._id === actualizado._id ? actualizado : p)));
      setPedidoActivo(actualizado);
      await cargarEstados();
    } catch (err) {
      alert(err?.response?.data?.error || 'No se pudo actualizar el estado');
    } finally {
      setGuardandoEstado(false);
    }
  };

  const crearEstado = async () => {
    const estadoLimpio = String(nuevoEstado || '').trim().toLowerCase();
    if (!estadoLimpio || !puedeCrearEstados || !localId) return;

    setCreandoEstado(true);
    try {
      const res = await crearEstadoPedidoWeb({ estado: estadoLimpio });
      const lista = Array.isArray(res?.data?.estados) ? res.data.estados : [];
      setEstados(lista.length > 0 ? lista : estados);
      if (lista.some((item) => String(item).toLowerCase() === estadoLimpio)) {
        setEstadosRepartidor((prev) => (prev.includes(estadoLimpio) ? prev : [...prev, estadoLimpio]));
      }
      setNuevoEstado('');
    } catch (err) {
      alert(err?.response?.data?.error || 'No se pudo crear el estado');
    } finally {
      setCreandoEstado(false);
    }
  };

  const guardarEstadosRepartidor = async () => {
    if (!puedeCrearEstados || !localId) return;
    setGuardandoEstadosRepartidor(true);
    try {
      const res = await guardarEstadosRepartidorPedidoWeb(estadosRepartidor);
      const lista = Array.isArray(res?.data?.estados) ? res.data.estados : estadosRepartidor;
      setEstadosRepartidor(lista.map((item) => String(item).toLowerCase()));
      alert('Estados de repartidor actualizados');
    } catch (err) {
      alert(err?.response?.data?.error || 'No se pudieron guardar estados para repartidor');
    } finally {
      setGuardandoEstadosRepartidor(false);
    }
  };

  const eliminarPedido = async (pedido) => {
    if (!pedido?._id || !puedeEliminarPedidos) return;
    const ok = window.confirm(`¿Eliminar pedido #${pedido.numero_pedido || pedido._id?.slice(-5)}?`);
    if (!ok) return;

    setEliminandoPedido(true);
    try {
      await eliminarPedidoWeb(pedido._id);
      setPedidos((prev) => prev.filter((p) => p._id !== pedido._id));
      if (pedidoActivo?._id === pedido._id) {
        setPedidoActivo(null);
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'No se pudo eliminar el pedido');
    } finally {
      setEliminandoPedido(false);
    }
  };

  const asignarRepartidor = async (pedido, repartidorId) => {
    if (!pedido?._id || !puedeAsignarRepartidor) return;
    if (!esPedidoDelivery(pedido)) {
      alert('Solo se puede asignar repartidor a pedidos delivery.');
      return;
    }

    setAsignandoRepartidorId(pedido._id);
    try {
      const res = await asignarRepartidorPedidoWeb(pedido._id, repartidorId || null);
      const actualizado = res?.data;
      setPedidos((prev) => prev.map((p) => (p._id === actualizado._id ? actualizado : p)));
      if (pedidoActivo?._id === actualizado._id) {
        setPedidoActivo(actualizado);
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'No se pudo asignar repartidor');
    } finally {
      setAsignandoRepartidorId('');
    }
  };

  const iniciarEdicionEstado = (estado) => {
    setEstadoEditando(estado);
    setEstadoNuevoValor(estado);
  };

  const guardarEdicionEstado = async (estadoActual) => {
    const nuevo = String(estadoNuevoValor || '').trim().toLowerCase();
    if (!nuevo || !puedeCrearEstados || !localId) return;

    setActualizandoEstado(true);
    try {
      const res = await editarEstadoPedidoWeb(estadoActual, { estado: nuevo });
      const lista = Array.isArray(res?.data?.estados) ? res.data.estados : [];
      setEstados(lista.length > 0 ? lista : estados);
      setEstadoEditando('');
      setEstadoNuevoValor('');
      setEstadosRepartidor((prev) =>
        prev.map((item) => (item === String(estadoActual).toLowerCase() ? nuevo : item))
      );
      if (pedidoActivo) {
        setEstadoEdicion((prev) => (prev === estadoActual ? nuevo : prev));
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'No se pudo editar el estado');
    } finally {
      setActualizandoEstado(false);
    }
  };

  const eliminarEstado = async (estado) => {
    if (!estado || !puedeCrearEstados || !localId) return;
    const ok = window.confirm(`¿Eliminar estado "${estado}"?`);
    if (!ok) return;

    setEliminandoEstado(estado);
    try {
      const res = await eliminarEstadoPedidoWeb(estado);
      const lista = Array.isArray(res?.data?.estados) ? res.data.estados : [];
      setEstados(lista.length > 0 ? lista : ESTADOS_DEFAULT);
      if (estadoEditando === estado) {
        setEstadoEditando('');
        setEstadoNuevoValor('');
      }
      setEstadosRepartidor((prev) => prev.filter((item) => item !== String(estado).toLowerCase()));
    } catch (err) {
      alert(err?.response?.data?.error || 'No se pudo eliminar el estado');
    } finally {
      setEliminandoEstado('');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Pedidos Web</Typography>
      {!localId && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography color="text.secondary">Selecciona un local para gestionar pedidos web.</Typography>
        </Paper>
      )}

      {puedeCrearEstados && localId && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Estados personalizados</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Box sx={{ width: { xs: '100%', md: 320 } }}>
              <TextField
                size="small"
                fullWidth
                label="Nuevo estado"
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                placeholder="ej: en_cocina"
              />
            </Box>
            <Button
              variant="contained"
              onClick={crearEstado}
              disabled={creandoEstado || !nuevoEstado.trim()}
              sx={{ width: { xs: '100%', md: 'auto' } }}
            >
              Crear estado
            </Button>
          </Stack>
          <Accordion
            disableGutters
            elevation={0}
            sx={{ mt: 1.5, border: '1px solid', borderColor: 'divider' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Listado de estados ({estados.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estados.map((estado) => (
                      <TableRow key={estado}>
                        <TableCell>
                          {estadoEditando === estado ? (
                            <TextField
                              size="small"
                              fullWidth
                              value={estadoNuevoValor}
                              onChange={(e) => setEstadoNuevoValor(e.target.value)}
                            />
                          ) : (
                            <Chip label={estado} size="small" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {estadoEditando === estado ? (
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="flex-end">
                              <Button
                                variant="contained"
                                onClick={() => guardarEdicionEstado(estado)}
                                disabled={actualizandoEstado || !estadoNuevoValor.trim()}
                              >
                                Guardar
                              </Button>
                              <Button
                                variant="text"
                                onClick={() => {
                                  setEstadoEditando('');
                                  setEstadoNuevoValor('');
                                }}
                              >
                                Cancelar
                              </Button>
                            </Stack>
                          ) : (
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="flex-end">
                              <Button size="small" variant="outlined" onClick={() => iniciarEdicionEstado(estado)}>
                                Editar
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                disabled={eliminandoEstado === estado}
                                onClick={() => eliminarEstado(estado)}
                              >
                                Eliminar
                              </Button>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Estados habilitados para repartidor</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
              <Select
                fullWidth
                size="small"
                multiple
                value={estadosRepartidor}
                onChange={(e) =>
                  setEstadosRepartidor(
                    (Array.isArray(e.target.value) ? e.target.value : [])
                      .map((item) => String(item).toLowerCase())
                  )
                }
                renderValue={(selected) => (selected || []).join(', ')}
              >
                {estados.map((estado) => (
                  <MenuItem key={estado} value={String(estado).toLowerCase()}>
                    {estado}
                  </MenuItem>
                ))}
              </Select>
              <Button
                variant="contained"
                disabled={guardandoEstadosRepartidor || estadosRepartidor.length === 0}
                onClick={guardarEstadosRepartidor}
              >
                Guardar para repartidor
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab value="abiertos" label={`Pedidos abiertos (${pedidos.filter((p) => !CERRADOS.has(getEstado(p))).length})`} />
          <Tab value="cerrados" label={`Pedidos completados/cerrados (${pedidos.filter((p) => CERRADOS.has(getEstado(p))).length})`} />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N° Pedido</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Repartidor</TableCell>
              <TableCell align="right">Accion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pedidosFiltrados.map((pedido) => (
              <TableRow key={pedido._id} hover>
                <TableCell>#{pedido.numero_pedido || pedido._id?.slice(-5)}</TableCell>
                <TableCell>{new Date(pedido.fecha || pedido.createdAt || Date.now()).toLocaleString()}</TableCell>
                <TableCell>{getClienteLabel(pedido)}</TableCell>
                <TableCell>{getTipoPedidoLabel(pedido)}</TableCell>
                <TableCell>${Number(pedido.total || 0).toLocaleString('es-CL')}</TableCell>
                <TableCell>
                  <Chip size="small" label={getEstado(pedido)} />
                </TableCell>
                <TableCell sx={{ minWidth: 220 }}>
                  {esPedidoDelivery(pedido) ? (
                    <Select
                      size="small"
                      fullWidth
                      value={pedido?.repartidor_asignado?._id || ''}
                      disabled={!puedeAsignarRepartidor || asignandoRepartidorId === pedido._id}
                      onChange={(e) => asignarRepartidor(pedido, e.target.value)}
                    >
                      <MenuItem value="">Sin asignar</MenuItem>
                      {repartidores.map((rep) => (
                        <MenuItem key={rep._id} value={rep._id}>
                          {rep.nombre || rep.email}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No aplica</Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setPedidoActivo(pedido);
                        setEstadoEdicion(getEstado(pedido));
                      }}
                    >
                      Ver
                    </Button>
                    {puedeEliminarPedidos && (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={eliminandoPedido}
                        onClick={() => eliminarPedido(pedido)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {pedidosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {loading ? 'Cargando pedidos...' : 'Sin pedidos en esta pestana'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Drawer
        anchor="right"
        open={Boolean(pedidoActivo)}
        onClose={() => setPedidoActivo(null)}
        PaperProps={{ sx: { width: { xs: '100%', md: 460 }, p: 2 } }}
      >
        {pedidoActivo && (
          <Stack spacing={1.5}>
            <Typography variant="h6">Pedido #{pedidoActivo.numero_pedido || pedidoActivo._id?.slice(-5)}</Typography>
            <Typography><strong>Cliente:</strong> {getClienteLabel(pedidoActivo)}</Typography>
            <Typography><strong>Fecha:</strong> {new Date(pedidoActivo.fecha || pedidoActivo.createdAt || Date.now()).toLocaleString()}</Typography>
            <Typography><strong>Total:</strong> ${Number(pedidoActivo.total || 0).toLocaleString('es-CL')}</Typography>
            <Typography>
              <strong>Tipo:</strong> {getTipoPedidoLabel(pedidoActivo)}
            </Typography>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Estado del pedido</Typography>
              <Stack direction="row" spacing={1}>
                <Select
                  size="small"
                  fullWidth
                  value={estadoEdicion}
                  onChange={(e) => setEstadoEdicion(e.target.value)}
                  disabled={!puedeGestionar}
                >
                  {estadosSelect.map((estado) => (
                    <MenuItem key={estado} value={estado}>{estado}</MenuItem>
                  ))}
                </Select>
                <Button
                  variant="contained"
                  onClick={guardarEstado}
                  disabled={guardandoEstado || !puedeGestionar}
                >
                  Guardar
                </Button>
              </Stack>
            </Box>

            {esPedidoDelivery(pedidoActivo) && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Asignar repartidor</Typography>
                <Select
                  size="small"
                  fullWidth
                  value={pedidoActivo?.repartidor_asignado?._id || ''}
                  disabled={!puedeAsignarRepartidor || asignandoRepartidorId === pedidoActivo._id}
                  onChange={(e) => asignarRepartidor(pedidoActivo, e.target.value)}
                >
                  <MenuItem value="">Sin asignar</MenuItem>
                  {repartidores.map((rep) => (
                    <MenuItem key={rep._id} value={rep._id}>
                      {rep.nombre || rep.email}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Detalle</Typography>
              <Stack spacing={1}>
                {(pedidoActivo.productos || []).map((prod, idx) => (
                  <Paper key={`${prod?.nombre || 'prod'}-${idx}`} variant="outlined" sx={{ p: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{prod?.nombre || 'Producto'}</Typography>
                    <Typography variant="body2">Cantidad: {prod?.cantidad || 1}</Typography>
                    <Typography variant="body2">Precio: ${Number(prod?.precio_unitario || 0).toLocaleString('es-CL')}</Typography>
                    {prod?.varianteNombre && (
                      <Typography variant="body2">Variacion: {prod.varianteNombre}</Typography>
                    )}
                    {Array.isArray(prod?.agregados) && prod.agregados.length > 0 && (
                      <Typography variant="body2">
                        Agregados: {prod.agregados.map((agg) => agg.nombre).join(', ')}
                      </Typography>
                    )}
                    {prod?.observacion && (
                      <Typography variant="body2">Obs: {prod.observacion}</Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
              <Button variant="contained" onClick={() => window.print()}>
                Imprimir
              </Button>
              {puedeEliminarPedidos && (
                <Button
                  variant="outlined"
                  color="error"
                  disabled={eliminandoPedido}
                  onClick={() => eliminarPedido(pedidoActivo)}
                >
                  Eliminar
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Box>
  );
}
