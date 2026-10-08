import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
  Stack,
  CircularProgress,
  Link
} from '@mui/material';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import { loginUsuario } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../possail.png';

const BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || loading) return;
    try {
      setLoading(true);
      const res = await loginUsuario({ email, password });
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.error;
      if (!status) {
        alert('No se pudo conectar al servidor (CORS/red).');
      } else if (status === 401) {
        alert(backendMsg || 'Credenciales inválidas');
      } else {
        alert(backendMsg || 'No se pudo iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        backgroundColor: '#020617',
        overflow: 'hidden'
      }}
    >
      {/* Fondo principal */}
      <Box
        sx={{
          flex: 1,
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.7) saturate(1.1)',
        }}
      />

      {/* Panel derecho */}
      <Box
        sx={{
          width: { xs: '100%', sm: 440, md: 460 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(2,6,23,0.9))',
          backdropFilter: 'blur(12px)',
          boxShadow: '-5px 0 30px rgba(0,0,0,0.5)',
          borderLeft: '1px solid rgba(59,130,246,0.25)',
          p: { xs: 3, sm: 4 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 360,
            background: 'transparent',
            color: '#f8fafc',
            borderRadius: 1.5, // 🔹 Bordes suaves, no tan redondeados
          }}
        >
          {/* Logo y texto */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src={logo}
              alt="Logo"
              sx={{
                width: 120,
                height: 52,
                objectFit: 'contain',
                mb: 1,
                filter: 'drop-shadow(0 10px 20px rgba(59,130,246,0.5))',
              }}
            />

            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#fff', mt: 1 }}
            >
              Sistema de Punto de Venta
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#9ca3af', mt: 1 }}
            >
              Gestiona inventario, tickets y cajas desde un solo lugar.
            </Typography>
          </Box>

          {/* Formulario */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#60a5fa' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 1, // 🔹 menos redondeado
                    bgcolor: 'rgba(255,255,255,0.05)',
                    input: { color: '#e2e8f0' },
                    '& fieldset': { border: 'none' }, // ❌ sin borde blanco
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                    borderBottom: '1px solid rgba(148,163,184,0.3)', // 🔹 línea inferior tenue
                    '&:focus-within': {
                      borderBottom: '1px solid #3b82f6', // 🔹 azul al focus
                    },
                    transition: 'border-color 0.25s ease',
                  },
                }}
                InputLabelProps={{
                  sx: {
                    color: '#94a3b8',
                    '&.Mui-focused': { color: '#60a5fa' },
                  },
                }}
                required
              />

              <TextField
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#60a5fa' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.05)',
                    input: { color: '#e2e8f0' },
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                    borderBottom: '1px solid rgba(148,163,184,0.3)',
                    '&:focus-within': {
                      borderBottom: '1px solid #3b82f6',
                    },
                    transition: 'border-color 0.25s ease',
                  },
                }}
                InputLabelProps={{
                  sx: {
                    color: '#94a3b8',
                    '&.Mui-focused': { color: '#60a5fa' },
                  },
                }}
                required
              />

              <Button
                type="submit"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.4,
                  borderRadius: 1.5, // 🔹 leve redondeo
                  fontWeight: 600,
                  fontSize: 15,
                  textTransform: 'none',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                  boxShadow: '0 15px 30px rgba(30,64,175,0.6)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                    boxShadow: '0 20px 40px rgba(30,64,175,0.8)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {loading ? (
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                  >
                    <CircularProgress
                      size={20}
                      thickness={5}
                      sx={{ color: '#e5e7eb' }}
                    />
                    <span>Ingresando...</span>
                  </Stack>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </Stack>
          </Box>

          {/* Pie */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography
              variant="caption"
              sx={{ color: '#9ca3af', fontSize: 12, display: 'block', mb: 1 }}
            >
              Acceso sólo para usuarios registrados del sistema.
            </Typography>
            <Link
              component="button"
              onClick={() => {}}
              sx={{
                fontSize: 13,
                color: '#60a5fa',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
