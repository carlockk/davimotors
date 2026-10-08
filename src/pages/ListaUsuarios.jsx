import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, IconButton, Paper, Modal,
  TextField, Button, MenuItem, Stack, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  obtenerUsuarios,
  eliminarUsuario,
  editarUsuario,
  obtenerLocales,
  crearUsuario
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ListaUsuarios() {
  const { usuario, selectedLocal } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [locales, setLocales] = useState([]);
  const [open, setOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [editData, setEditData] = useState({ nombre: '', rol: '', password: '', local: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'cajero',
    local: ''
  });
  const [createError, setCreateError] = useState('');

  const cargarUsuarios = async () => {
    const res = await obtenerUsuarios();
    setUsuarios(res.data);
  };

  const cargarLocales = async () => {
    try {
      const res = await obtenerLocales();
      setLocales(res.data || []);
    } catch (err) {
      setLocales([]);
    }
  };

  const handleEliminar = async (id) => {
    if (confirm('¿Eliminar este usuario?')) {
      await eliminarUsuario(id);
      await cargarUsuarios();
    }
  };

  const handleAbrirEdicion = (usuario) => {
    const localId =
      typeof usuario?.local === 'string'
        ? usuario.local
        : usuario?.local?._id || '';
    const localEdit = usuario?.rol === 'repartidor' && !localId ? '__all__' : localId;
    setUsuarioEditando(usuario);
    setEditData({
      nombre: usuario?.nombre || '',
      rol: usuario.rol,
      password: '',
      local: localEdit
    });
    setOpen(true);
  };

  const handleGuardarCambios = async () => {
    const payload = {
      nombre: (editData.nombre || '').trim(),
      rol: editData.rol
    };
    if (usuario?.rol === 'superadmin') {
      payload.local = editData.local === '__all__'
        ? null
        : (editData.local === '' ? null : editData.local);
    }
    if (editData.password && editData.password.trim()) {
      payload.password = editData.password;
    }

    await editarUsuario(usuarioEditando._id, payload);
    setOpen(false);
    await cargarUsuarios();
  };

  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleOpenCreate = () => {
    setCreateData({
      nombre: '',
      email: '',
      password: '',
      rol: 'cajero',
      local: ''
    });
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreateChange = (e) => {
    setCreateData({ ...createData, [e.target.name]: e.target.value });
  };

  const handleCreate = async () => {
    setCreateError('');
    if (!createData.nombre.trim() || !createData.email.trim() || !createData.password) {
      setCreateError('Nombre, email y contraseña son obligatorios.');
      return;
    }
    const repartidorGlobal = usuario?.rol === 'superadmin' && createData.rol === 'repartidor' && createData.local === '__all__';
    if (usuario?.rol === 'superadmin' && !createData.local && !repartidorGlobal) {
      setCreateError('Selecciona un local para el usuario.');
      return;
    }
    try {
      await crearUsuario({
        nombre: createData.nombre.trim(),
        email: createData.email.trim(),
        password: createData.password,
        rol: createData.rol,
        local: usuario?.rol === 'superadmin'
          ? (repartidorGlobal ? null : createData.local)
          : undefined
      });
      setCreateOpen(false);
      cargarUsuarios();
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudo crear el usuario.';
      setCreateError(msg);
    }
  };

  useEffect(() => {
    if (usuario?.rol === 'superadmin' && !selectedLocal?._id) {
      setUsuarios([]);
      return;
    }
    cargarUsuarios();
    cargarLocales();
  }, [usuario?.rol, selectedLocal?._id]);

  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">📋 Lista de Usuarios</Typography>
        <Button variant="contained" onClick={handleOpenCreate}>
          Crear nuevo usuario
        </Button>
      </Stack>
      <Paper
        elevation={0}
        sx={{
          overflowX: 'auto',
          backgroundColor: 'transparent',
          boxShadow: 'none',
          fontSize: '0.92rem',
          '& .MuiTypography-body1, & .MuiTypography-body2, & .MuiTypography-subtitle2': {
            fontSize: '0.92rem'
          },
          '& .MuiTableCell-root': { fontSize: '0.85rem' }
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Local</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u._id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.rol}</TableCell>
                <TableCell>{u.local?.nombre || 'Sin asignar'}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleAbrirEdicion(u)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleEliminar(u._id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal para editar */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper', p: 4, borderRadius: 2, width: 300
        }}>
          <Typography variant="h6" gutterBottom>✏️ Editar Usuario</Typography>
          <TextField
            label="Nombre"
            name="nombre"
            fullWidth
            value={editData.nombre}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Email"
            value={usuarioEditando?.email || ''}
            fullWidth
            disabled
            sx={{ mb: 2 }}
          />
          <TextField
            select
            label="Rol"
            name="rol"
            fullWidth
            value={editData.rol}
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
            value={editData.local}
            onChange={handleChange}
            sx={{ mb: 2 }}
            disabled={usuario?.rol !== 'superadmin' || locales.length === 0}
          >
            {editData.rol === 'repartidor' && usuario?.rol === 'superadmin' && (
              <MenuItem value="__all__">Todos los locales (repartidor global)</MenuItem>
            )}
            <MenuItem value="">
              {locales.length === 0 ? 'No hay locales disponibles' : 'Sin asignar'}
            </MenuItem>
            {locales.map((local) => (
              <MenuItem key={local._id} value={local._id}>
                {local.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Nueva Contraseña"
            name="password"
            type="password"
            fullWidth
            value={editData.password}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" fullWidth onClick={handleGuardarCambios}>
            Guardar Cambios
          </Button>
        </Box>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper', p: 4, borderRadius: 2, width: 360
        }}>
          <Typography variant="h6" gutterBottom>➕ Crear Usuario</Typography>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <TextField
            label="Nombre"
            name="nombre"
            fullWidth
            value={createData.nombre}
            onChange={handleCreateChange}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Email"
            name="email"
            fullWidth
            value={createData.email}
            onChange={handleCreateChange}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Contraseña"
            name="password"
            type="password"
            fullWidth
            value={createData.password}
            onChange={handleCreateChange}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            label="Rol"
            name="rol"
            fullWidth
            value={createData.rol}
            onChange={handleCreateChange}
            sx={{ mb: 2 }}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="cajero">Cajero</MenuItem>
            <MenuItem value="mesero">Mesero</MenuItem>
            <MenuItem value="repartidor">Repartidor</MenuItem>
          </TextField>
          {usuario?.rol === 'superadmin' && (
            <TextField
              select
              label="Local"
              name="local"
              fullWidth
              value={createData.local}
              onChange={handleCreateChange}
              sx={{ mb: 2 }}
            >
              {createData.rol === 'repartidor' && (
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
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreate}>
              Crear
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
