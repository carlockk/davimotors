import { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, MenuItem
} from '@mui/material';
import { crearUsuario, obtenerLocales } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CrearUsuario() {
  const { usuario, selectedLocal } = useAuth();
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'cajero',
    local: ''
  });
  const [locales, setLocales] = useState([]);

  useEffect(() => {
    const cargarLocales = async () => {
      try {
        const res = await obtenerLocales();
        setLocales(res.data || []);
      } catch (err) {
        setLocales([]);
      }
    };

    cargarLocales();
  }, []);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol === 'superadmin') {
      setForm((prev) => ({ ...prev, local: selectedLocal?._id || '' }));
    } else {
      setForm((prev) => ({ ...prev, local: usuario?.local?._id || '' }));
    }
  }, [usuario, selectedLocal]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const { nombre, email, password, rol, local } = form;

    if (!nombre || !email || !password) {
      alert('Todos los campos son obligatorios');
      return;
    }
    const repartidorGlobal = usuario?.rol === 'superadmin' && rol === 'repartidor' && local === '__all__';
    if (rol !== 'superadmin' && !local && !repartidorGlobal) {
      alert('Selecciona un local para el usuario');
      return;
    }

    try {
      await crearUsuario({
        nombre,
        email,
        password,
        rol,
        local: usuario?.rol === 'superadmin'
          ? (repartidorGlobal ? null : (local || null))
          : usuario?.local?._id || null
      });
      alert('✅ Usuario creado correctamente');
      setForm({ nombre: '', email: '', password: '', rol: 'cajero', local: '' });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Error inesperado';
      alert(`❌ ${msg}`);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>👤 Crear Usuario</Typography>

      <TextField
        label="Nombre"
        name="nombre"
        fullWidth
        value={form.nombre}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Email"
        name="email"
        fullWidth
        value={form.email}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Contraseña"
        name="password"
        type="password"
        fullWidth
        value={form.password}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      <TextField
        select
        label="Rol"
        name="rol"
        fullWidth
        value={form.rol}
        onChange={handleChange}
        sx={{ mb: 2 }}
      >
        <MenuItem value="admin">Admin</MenuItem>
        <MenuItem value="cajero">Cajero</MenuItem>
        <MenuItem value="mesero">Mesero</MenuItem>
        <MenuItem value="repartidor">Repartidor</MenuItem>
      </TextField>

      <TextField
        select
        label="Local"
        name="local"
        fullWidth
        value={form.local}
        onChange={handleChange}
        sx={{ mb: 2 }}
        disabled={usuario?.rol !== 'superadmin' || locales.length === 0}
      >
        {form.rol === 'repartidor' && usuario?.rol === 'superadmin' && (
          <MenuItem value="__all__">Todos los locales (repartidor global)</MenuItem>
        )}
        <MenuItem value="">
          {locales.length === 0 ? 'No hay locales disponibles' : 'Selecciona un local'}
        </MenuItem>
        {locales.map((local) => (
          <MenuItem key={local._id} value={local._id}>
            {local.nombre}
          </MenuItem>
        ))}
      </TextField>

      <Button variant="contained" fullWidth onClick={handleSubmit}>
        Crear Usuario
      </Button>
    </Box>
  );
}
