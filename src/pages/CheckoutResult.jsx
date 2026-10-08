import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { confirmarSesionPagoWeb } from '../services/api';

export default function CheckoutResult() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [mensaje, setMensaje] = useState('Confirmando pago...');
  const [pedido, setPedido] = useState(null);

  useEffect(() => {
    const confirmar = async () => {
      const tokenWs = params.get('token_ws');
      const tbkToken = params.get('TBK_TOKEN');

      if (!tokenWs) {
        if (tbkToken) {
          setMensaje('Pago cancelado o rechazado.');
        } else {
          setMensaje('No se encontro token de pago.');
        }
        setLoading(false);
        return;
      }

      try {
        const res = await confirmarSesionPagoWeb(tokenWs);
        setOk(Boolean(res?.data?.ok));
        setPedido(res?.data?.venta || null);
        setMensaje(res?.data?.ok ? 'Pago confirmado correctamente.' : 'No se pudo confirmar el pago.');
      } catch (err) {
        setOk(false);
        setMensaje(err?.response?.data?.error || 'No se pudo confirmar el pago.');
      } finally {
        setLoading(false);
      }
    };

    confirmar();
  }, [params]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 520 }}>
        <Stack spacing={2}>
          <Typography variant="h5" gutterBottom>
            Resultado del pago
          </Typography>

          {loading && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={20} />
              <Typography variant="body2">{mensaje}</Typography>
            </Stack>
          )}

          {!loading && (
            <Alert severity={ok ? 'success' : 'error'}>
              {mensaje}
            </Alert>
          )}

          {!loading && pedido && (
            <Box>
              <Typography variant="body2"><strong>Pedido:</strong> #{pedido.numero_pedido}</Typography>
              <Typography variant="body2"><strong>Total:</strong> ${Number(pedido.total || 0).toLocaleString('es-CL')}</Typography>
              <Typography variant="body2"><strong>Estado:</strong> {pedido.estado_pedido}</Typography>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
