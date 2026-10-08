import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import {
  actualizarEstadoLoteInsumo,
  eliminarLoteInsumo,
  eliminarLotesInsumo,
  obtenerLotesInsumo
} from '../../services/api';

const estadoVencimiento = (lote, alertaDias) => {
  if (!lote?.fecha_vencimiento) return 'normal';
  const hoy = new Date();
  const venc = new Date(lote.fecha_vencimiento);
  if (Number.isNaN(venc.getTime())) return 'normal';
  const diff = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'vencido';
  if (diff <= alertaDias) return 'por_vencer';
  return 'normal';
};

export default function LotesDialog({
  open,
  onClose,
  insumo,
  isAdmin,
  onError,
  onInfo,
  onRefreshInsumos
}) {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarLotesOcultos, setMostrarLotesOcultos] = useState(false);

  const recargarLotes = async (insumoId, incluirOcultos) => {
    const res = await obtenerLotesInsumo(insumoId, {
      incluir_ocultos: incluirOcultos ? 'true' : 'false'
    });
    setLotes(res.data || []);
  };

  useEffect(() => {
    if (!open || !insumo?._id) return;
    setMostrarLotesOcultos(false);
    setLoading(true);
    obtenerLotesInsumo(insumo._id, { incluir_ocultos: 'false' })
      .then((res) => setLotes(res.data || []))
      .catch(() => onError?.('No se pudieron cargar los lotes.'))
      .finally(() => setLoading(false));
  }, [open, insumo?._id, onError]);

  const handleEliminarLote = async (loteId) => {
    if (!insumo?._id) return;
    const confirmar = window.confirm('Seguro que deseas eliminar este lote?');
    if (!confirmar) return;
    try {
      setLoading(true);
      await eliminarLoteInsumo(insumo._id, loteId);
      await recargarLotes(insumo._id, mostrarLotesOcultos);
      onRefreshInsumos?.();
    } catch (err) {
      onError?.(err?.response?.data?.error || 'No se pudo eliminar el lote.');
    } finally {
      setLoading(false);
    }
  };

  const handleOcultarLote = async (loteId, activo) => {
    if (!insumo?._id) return;
    try {
      setLoading(true);
      await actualizarEstadoLoteInsumo(insumo._id, loteId, { activo });
      await recargarLotes(insumo._id, mostrarLotesOcultos);
    } catch (err) {
      onError?.(err?.response?.data?.error || 'No se pudo actualizar el lote.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarTodosLotes = async () => {
    if (!insumo?._id) return;
    const confirmar = window.confirm('Seguro que deseas eliminar todos los lotes?');
    if (!confirmar) return;
    try {
      setLoading(true);
      await eliminarLotesInsumo(insumo._id);
      setLotes([]);
      onRefreshInsumos?.();
      onInfo?.('Lotes eliminados.');
    } catch (err) {
      onError?.(err?.response?.data?.error || 'No se pudieron eliminar los lotes.');
    } finally {
      setLoading(false);
    }
  };

  const estadosPorLote = useMemo(() => {
    const map = new Map();
    lotes.forEach((lote) => {
      const estado = estadoVencimiento(lote, Number(insumo?.alerta_vencimiento_dias || 7));
      map.set(lote._id, estado);
    });
    return map;
  }, [lotes, insumo?.alerta_vencimiento_dias]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Lotes de {insumo?.nombre}</DialogTitle>
      <DialogContent dividers>
        {isAdmin && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant={mostrarLotesOcultos ? 'contained' : 'outlined'}
              onClick={async () => {
                const next = !mostrarLotesOcultos;
                setMostrarLotesOcultos(next);
                if (insumo?._id) {
                  await recargarLotes(insumo._id, next);
                }
              }}
            >
              {mostrarLotesOcultos ? 'Ocultos visibles' : 'Mostrar ocultos'}
            </Button>
            {lotes.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleEliminarTodosLotes}
                disabled={loading}
              >
                {loading ? 'Eliminando...' : 'Eliminar todos los lotes'}
              </Button>
            )}
          </Stack>
        )}
        {loading && lotes.length === 0 ? (
          <Typography color="text.secondary">Cargando lotes...</Typography>
        ) : lotes.length === 0 ? (
          <Typography color="text.secondary">No hay lotes registrados.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lote</TableCell>
                <TableCell>Vencimiento</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Estado</TableCell>
                {isAdmin && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {lotes.map((lote) => {
                const estado = estadosPorLote.get(lote._id) || 'normal';
                const label =
                  estado === 'vencido' ? 'Vencido' : estado === 'por_vencer' ? 'Por vencer' : 'Normal';
                const color =
                  estado === 'vencido' ? 'error' : estado === 'por_vencer' ? 'warning' : 'success';
                const loteOculto = lote.activo === false;
                return (
                  <TableRow key={lote._id}>
                    <TableCell>{lote.lote || '-'}</TableCell>
                    <TableCell>
                      {lote.fecha_vencimiento
                        ? new Date(lote.fecha_vencimiento).toLocaleDateString()
                        : 'Sin vencimiento'}
                    </TableCell>
                    <TableCell>{lote.cantidad}</TableCell>
                    <TableCell>
                      <Chip size="small" color={color} label={label} />
                      {isAdmin && loteOculto && (
                        <Chip size="small" label="Oculto" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            color={lote.activo ? 'warning' : 'success'}
                            onClick={() => handleOcultarLote(lote._id, !lote.activo)}
                            disabled={loading}
                          >
                            {lote.activo ? 'Ocultar' : 'Restaurar'}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleEliminarLote(lote._id)}
                            disabled={loading}
                          >
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
