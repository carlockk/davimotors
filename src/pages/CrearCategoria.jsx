// src/pages/CrearCategoria.jsx
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
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

import { useAuth } from '../context/AuthContext';
import {
  obtenerCategorias,
  crearCategoria,
  editarCategoria,
  eliminarCategoria,
  obtenerLocales,
  clonarCategorias
} from '../services/api';

const emptyForm = { nombre: '', descripcion: '', parent: '' };

const buildCategoryLabelMap = (items) => {
  const byId = new Map(items.map((cat) => [cat._id, cat]));
  const cache = new Map();

  const buildLabel = (cat, stack = new Set()) => {
    if (!cat) return '';
    if (cache.has(cat._id)) return cache.get(cat._id);
    if (stack.has(cat._id)) return cat.nombre || '';
    stack.add(cat._id);
    const parent = cat.parent ? byId.get(cat.parent) : null;
    const label = parent ? `${buildLabel(parent, stack)} / ${cat.nombre}` : cat.nombre || '';
    cache.set(cat._id, label);
    return label;
  };

  return items.map((cat) => ({
    ...cat,
    label: buildLabel(cat)
  }));
};

export default function Categorias() {
  const { usuario, selectedLocal } = useAuth();
  const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'superadmin';

  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [locales, setLocales] = useState([]);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneLocal, setCloneLocal] = useState('');
  const [cloneCategorias, setCloneCategorias] = useState([]);
  const [cloneCategoriaId, setCloneCategoriaId] = useState('');
  const [cloneAll, setCloneAll] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);

  const fetchCategorias = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await obtenerCategorias();
      setCategorias(buildCategoryLabelMap(res.data || []));
    } catch (err) {
      setError('No se pudieron cargar las categorias.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocales = async () => {
    try {
      const res = await obtenerLocales();
      setLocales(res.data || []);
    } catch (err) {
      setLocales([]);
    }
  };

  useEffect(() => {
    fetchCategorias();
    fetchLocales();
  }, [selectedLocal?._id]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
    setInfo('');
    setError('');
  };

  const openEdit = (cat) => {
    setForm({
      nombre: cat.nombre || '',
      descripcion: cat.descripcion || '',
      parent: cat.parent || ''
    });
    setEditingId(cat._id);
    setDialogOpen(true);
    setInfo('');
    setError('');
  };

  const handleSave = async () => {
    setError('');
    setInfo('');

    if (!form.nombre.trim()) {
      setError('Ingresa un nombre para la categoria.');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      parent: form.parent || null
    };

    try {
      setSaving(true);
      if (editingId) {
        await editarCategoria(editingId, payload);
        setInfo('Categoria actualizada.');
      } else {
        await crearCategoria(payload);
        setInfo('Categoria creada.');
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchCategorias();
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudo guardar la categoria.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (cat) => {
    setDeleteTarget(cat);
    setError('');
    setInfo('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      await eliminarCategoria(deleteTarget._id);
      setInfo('Categoria eliminada.');
      setDeleteTarget(null);
      fetchCategorias();
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudo eliminar la categoria.';
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
  };

  const handleOpenClone = () => {
    setCloneOpen(true);
    setCloneLocal('');
    setCloneCategorias([]);
    setCloneCategoriaId('');
    setCloneAll(false);
    setError('');
    setInfo('');
  };

  useEffect(() => {
    if (!cloneLocal) {
      setCloneCategorias([]);
      return;
    }
    obtenerCategorias(cloneLocal)
      .then((res) => setCloneCategorias(buildCategoryLabelMap(res.data || [])))
      .catch(() => setCloneCategorias([]));
  }, [cloneLocal]);

  const handleClone = async () => {
    if (!cloneLocal || (!cloneCategoriaId && !cloneAll)) {
      setError('Selecciona el local y la categoria a clonar.');
      return;
    }
    try {
      setCloneLoading(true);
      await clonarCategorias({
        sourceLocalId: cloneLocal,
        categoriaId: cloneAll ? null : cloneCategoriaId,
        clonarTodas: cloneAll
      });
      setInfo('Categorias clonadas correctamente.');
      setCloneOpen(false);
      fetchCategorias();
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudo clonar la categoria.';
      setError(msg);
    } finally {
      setCloneLoading(false);
    }
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
              Categorias
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administra las categorias disponibles para tus productos.
            </Typography>
          </Box>

          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
            >
              Crear nueva categoria
            </Button>
          )}
          {usuario?.rol === 'superadmin' && (
            <Button variant="outlined" onClick={handleOpenClone}>
              Clonar desde otro local
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
                <TableCell>Categoria padre</TableCell>
                <TableCell>Descripcion</TableCell>
                {isAdmin && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {categorias.length === 0 && (
                <TableRow>
                    <TableCell colSpan={isAdmin ? 4 : 3} align="center">
                      No hay categorias registradas.
                    </TableCell>
                </TableRow>
              )}
              {categorias.map((cat) => (
                <TableRow key={cat._id}>
                    <TableCell>{cat.label || cat.nombre || '-'}</TableCell>
                    <TableCell>
                      {cat.parent
                        ? categorias.find((c) => c._id === cat.parent)?.label || '-'
                        : '-'}
                    </TableCell>
                    <TableCell>{cat.descripcion || '-'}</TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <IconButton onClick={() => openEdit(cat)} size="small" sx={{ mr: 0.5 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => confirmDelete(cat)}
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
          {editingId ? 'Editar categoria' : 'Crear categoria'}
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
              select
              label="Categoria padre (opcional)"
              value={form.parent}
              onChange={(e) => setForm((prev) => ({ ...prev, parent: e.target.value }))}
            >
              <MenuItem value="">
                Sin categoria padre
              </MenuItem>
              {categorias
                .filter((cat) => cat._id !== editingId)
                .map((cat) => (
                  <MenuItem key={cat._id} value={cat._id}>
                    {cat.label || cat.nombre}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label="Descripcion"
              value={form.descripcion}
              onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              multiline
              minRows={2}
            />
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
        <DialogTitle>Eliminar categoria</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Seguro que deseas eliminar la categoria "{deleteTarget?.nombre}"?
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

      <Dialog open={cloneOpen} onClose={() => setCloneOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Clonar categorias desde otro local</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Local origen"
              value={cloneLocal}
              onChange={(e) => setCloneLocal(e.target.value)}
            >
              <MenuItem value="">
                {locales.length === 0 ? 'No hay locales disponibles' : 'Selecciona un local'}
              </MenuItem>
              {locales.map((local) => (
                <MenuItem key={local._id} value={local._id}>
                  {local.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Categoria a clonar (incluye subcategorias)"
              value={cloneCategoriaId}
              onChange={(e) => setCloneCategoriaId(e.target.value)}
              disabled={!cloneLocal || cloneAll}
            >
              <MenuItem value="">
                {cloneLocal ? 'Selecciona una categoria' : 'Selecciona un local primero'}
              </MenuItem>
              {cloneCategorias.map((cat) => (
                <MenuItem key={cat._id} value={cat._id}>
                  {cat.label || cat.nombre}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={cloneAll}
                  onChange={(e) => setCloneAll(e.target.checked)}
                  disabled={!cloneLocal}
                />
              }
              label="Clonar todas las categorias del local"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleClone} disabled={cloneLoading}>
            {cloneLoading ? 'Clonando...' : 'Clonar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
