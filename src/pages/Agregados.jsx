import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import {
  clonarAgregados,
  crearAgregado,
  crearGrupoAgregados,
  editarAgregado,
  editarGrupoAgregados,
  eliminarAgregado,
  eliminarGrupoAgregados,
  obtenerAgregados,
  obtenerCategorias,
  obtenerGruposAgregados,
  obtenerLocales,
  obtenerProductos
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyGrupo = {
  categoriaPrincipal: '',
  titulo: '',
  descripcion: '',
  modoSeleccion: 'multiple',
  obligatorio: false
};
const emptyAgregado = {
  nombre: '',
  descripcion: '',
  precio: '',
  grupos: [],
  categorias: [],
  productos: []
};

const buildCategoryLabelMap = (items = []) => {
  const byId = new Map((items || []).map((cat) => [String(cat._id), cat]));
  const cache = new Map();

  const buildLabel = (cat, stack = new Set()) => {
    if (!cat || !cat._id) return '';
    const id = String(cat._id);
    if (cache.has(id)) return cache.get(id);
    if (stack.has(id)) return String(cat.nombre || '');

    stack.add(id);
    const parentId = cat.parent ? String(cat.parent) : '';
    const parent = parentId ? byId.get(parentId) : null;
    const label = parent
      ? `${buildLabel(parent, stack)} / ${String(cat.nombre || '')}`
      : String(cat.nombre || '');

    cache.set(id, label);
    return label;
  };

  return (items || []).map((cat) => ({
    ...cat,
    label: buildLabel(cat)
  }));
};

export default function Agregados() {
  const { usuario, selectedLocal } = useAuth();
  const puedeCrearEditar = ['admin', 'superadmin', 'cajero'].includes(usuario?.rol);
  const puedeEliminar = ['admin', 'superadmin'].includes(usuario?.rol);

  const [grupos, setGrupos] = useState([]);
  const [agregados, setAgregados] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [locales, setLocales] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [grupoOpen, setGrupoOpen] = useState(false);
  const [grupoForm, setGrupoForm] = useState(emptyGrupo);
  const [grupoEditId, setGrupoEditId] = useState('');

  const [agregadoOpen, setAgregadoOpen] = useState(false);
  const [agregadoForm, setAgregadoForm] = useState(emptyAgregado);
  const [agregadoEditId, setAgregadoEditId] = useState('');
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneLocal, setCloneLocal] = useState('');
  const [cloneAgregados, setCloneAgregados] = useState([]);
  const [cloneAgregadoId, setCloneAgregadoId] = useState('');
  const [cloneAll, setCloneAll] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState('');
  const [categoriaEditOpen, setCategoriaEditOpen] = useState(false);
  const [categoriaEditData, setCategoriaEditData] = useState(null);
  const [categoriaEditNombre, setCategoriaEditNombre] = useState('');

  const productosOptions = useMemo(
    () =>
      productos.map((p) => ({
        _id: p._id,
        nombre: p.nombre || p.productoBase?.nombre || 'Producto'
      })),
    [productos]
  );

  const categoriaPrincipalOptions = useMemo(
    () =>
      buildCategoryLabelMap(categorias || [])
        .map((cat) => String(cat.label || cat.nombre || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [categorias]
  );

  const hasLegacyCategoriaPrincipal = useMemo(() => {
    const actual = String(grupoForm.categoriaPrincipal || '').trim();
    if (!actual) return false;
    return !categoriaPrincipalOptions.includes(actual);
  }, [grupoForm.categoriaPrincipal, categoriaPrincipalOptions]);

  const hasLegacyCategoriaEdit = useMemo(() => {
    const actual = String(categoriaEditNombre || '').trim();
    if (!actual) return false;
    return !categoriaPrincipalOptions.includes(actual);
  }, [categoriaEditNombre, categoriaPrincipalOptions]);

  const agregadosByGrupo = useMemo(() => {
    const map = new Map();
    (agregados || []).forEach((agg) => {
      const gruposAgg = Array.isArray(agg?.grupos) && agg.grupos.length > 0
        ? agg.grupos
        : (agg?.grupo ? [agg.grupo] : []);
      gruposAgg.forEach((group) => {
        const groupId = String(group?._id || group || '');
        if (!groupId) return;
        if (!map.has(groupId)) map.set(groupId, []);
        map.get(groupId).push(agg);
      });
    });
    return map;
  }, [agregados]);

  const categoriasAgrupadas = useMemo(() => {
    const map = new Map();
    (grupos || []).forEach((grupo) => {
      const nombre = String(grupo?.categoriaPrincipal || '').trim() || 'Sin categoria principal';
      if (!map.has(nombre)) {
        map.set(nombre, { nombre, grupos: [], totalOpciones: 0 });
      }
      const bucket = map.get(nombre);
      bucket.grupos.push(grupo);
      bucket.totalOpciones += (agregadosByGrupo.get(String(grupo._id)) || []).length;
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [grupos, agregadosByGrupo]);

  const gruposCategoriaActiva = useMemo(() => {
    const match = categoriasAgrupadas.find((c) => c.nombre === categoriaActiva);
    return match?.grupos || [];
  }, [categoriasAgrupadas, categoriaActiva]);

  const categoriaEditOpcionesCount = useMemo(() => {
    if (!categoriaEditData?.grupos) return 0;
    return categoriaEditData.grupos.reduce(
      (acc, grupo) => acc + (agregadosByGrupo.get(String(grupo._id)) || []).length,
      0
    );
  }, [categoriaEditData, agregadosByGrupo]);

  const cargar = async () => {
    setError('');
    try {
      const [gruposRes, agregadosRes, categoriasRes, productosRes] = await Promise.all([
        obtenerGruposAgregados(),
        obtenerAgregados(),
        obtenerCategorias(),
        obtenerProductos()
      ]);
      setGrupos(gruposRes.data || []);
      setAgregados(agregadosRes.data || []);
      setCategorias(categoriasRes.data || []);
      setProductos(productosRes.data || []);
    } catch (err) {
      setError('No se pudo cargar agregados.');
    }
  };

  useEffect(() => {
    cargar();
    if (usuario?.rol === 'superadmin') {
      obtenerLocales()
        .then((res) => setLocales(res.data || []))
        .catch(() => setLocales([]));
    } else {
      setLocales([]);
    }
  }, [selectedLocal?._id]);

  useEffect(() => {
    if (!cloneLocal) {
      setCloneAgregados([]);
      return;
    }
    obtenerAgregados(cloneLocal)
      .then((res) => setCloneAgregados(res.data || []))
      .catch(() => setCloneAgregados([]));
  }, [cloneLocal]);

  useEffect(() => {
    if (categoriasAgrupadas.length === 0) {
      setCategoriaActiva('');
      return;
    }
    const existeActiva = categoriasAgrupadas.some((c) => c.nombre === categoriaActiva);
    if (!categoriaActiva || !existeActiva) {
      setCategoriaActiva(categoriasAgrupadas[0].nombre);
    }
  }, [categoriasAgrupadas, categoriaActiva]);

  const openCrearGrupo = () => {
    setGrupoEditId('');
    setGrupoForm({
      ...emptyGrupo,
      categoriaPrincipal:
        categoriaActiva && categoriaActiva !== 'Sin categoria principal' ? categoriaActiva : ''
    });
    setGrupoOpen(true);
  };

  const openEditarGrupo = (grupo) => {
    setGrupoEditId(grupo._id);
    setGrupoForm({
      categoriaPrincipal: grupo.categoriaPrincipal || '',
      titulo: grupo.titulo || '',
      descripcion: grupo.descripcion || '',
      modoSeleccion: grupo.modoSeleccion === 'unico' ? 'unico' : 'multiple',
      obligatorio: Boolean(grupo.obligatorio)
    });
    setGrupoOpen(true);
  };

  const guardarGrupo = async () => {
    if (!grupoForm.titulo.trim()) {
      setError('El titulo del grupo es obligatorio.');
      return;
    }
    try {
      if (grupoEditId) {
        await editarGrupoAgregados(grupoEditId, grupoForm);
        setInfo('Grupo actualizado.');
      } else {
        await crearGrupoAgregados(grupoForm);
        setInfo('Grupo creado.');
      }
      setGrupoOpen(false);
      setGrupoForm(emptyGrupo);
      setGrupoEditId('');
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo guardar el grupo.');
    }
  };

  const borrarGrupo = async (id) => {
    if (!puedeEliminar) return;
    if (!window.confirm('Seguro que deseas eliminar este grupo?')) return;
    try {
      await eliminarGrupoAgregados(id);
      setInfo('Grupo eliminado.');
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo eliminar el grupo.');
    }
  };

  const abrirEditarCategoriaAgregados = (categoria) => {
    if (!puedeCrearEditar) return;
    const actual = categoria?.nombre === 'Sin categoria principal' ? '' : String(categoria?.nombre || '');
    setCategoriaEditData(categoria || null);
    setCategoriaEditNombre(actual);
    setCategoriaEditOpen(true);
  };

  const guardarEdicionCategoriaAgregados = async () => {
    if (!categoriaEditData) return;
    const categoriaPrincipal = String(categoriaEditNombre || '').trim();
    try {
      await Promise.all(
        (categoriaEditData?.grupos || []).map((grupo) =>
          editarGrupoAgregados(grupo._id, {
            categoriaPrincipal,
            titulo: grupo.titulo || '',
            descripcion: grupo.descripcion || '',
            modoSeleccion: grupo.modoSeleccion === 'unico' ? 'unico' : 'multiple',
            obligatorio: Boolean(grupo.obligatorio)
          })
        )
      );
      setInfo('Categoria de agregados actualizada.');
      setCategoriaEditOpen(false);
      setCategoriaEditData(null);
      setCategoriaEditNombre('');
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo editar la categoria de agregados.');
    }
  };

  const borrarCategoriaAgregados = async (categoria) => {
    if (!puedeEliminar) return;

    const gruposCategoria = Array.isArray(categoria?.grupos) ? categoria.grupos : [];
    const groupIds = gruposCategoria.map((g) => String(g._id));
    const opcionesCategoria = groupIds.flatMap((groupId) => agregadosByGrupo.get(groupId) || []);

    const confirmacion = window.confirm(
      `Seguro que deseas eliminar la categoria "${categoria?.nombre}"?\n\n` +
      `Tambien se eliminaran todos sus contenidos:\n` +
      `- Titulos: ${gruposCategoria.length}\n` +
      `- Opciones: ${opcionesCategoria.length}\n\n` +
      `Esta accion no se puede deshacer.`
    );
    if (!confirmacion) return;

    try {
      await Promise.all(opcionesCategoria.map((agg) => eliminarAgregado(agg._id)));
      await Promise.all(gruposCategoria.map((grupo) => eliminarGrupoAgregados(grupo._id)));
      setInfo('Categoria de agregados y su contenido eliminados.');
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo eliminar la categoria de agregados.');
    }
  };

  const openCrearAgregado = () => {
    setAgregadoEditId('');
    setAgregadoForm(emptyAgregado);
    setAgregadoOpen(true);
  };

  const openEditarAgregado = (agregado) => {
    setAgregadoEditId(agregado._id);
    setAgregadoForm({
      nombre: agregado.nombre || '',
      descripcion: agregado.descripcion || '',
      precio:
        agregado.precio === null || agregado.precio === undefined ? '' : String(agregado.precio),
      grupos: Array.from(
        new Set(
          [
            ...((agregado.grupos || []).map((g) => String(g?._id || g))),
            ...(agregado.grupo ? [String(agregado.grupo?._id || agregado.grupo)] : [])
          ].filter(Boolean)
        )
      ),
      categorias: (agregado.categorias || []).map((c) => c._id || c),
      productos: (agregado.productos || []).map((p) => p._id || p)
    });
    setAgregadoOpen(true);
  };

  const guardarAgregado = async () => {
    if (!agregadoForm.nombre.trim()) {
      setError('El nombre del agregado es obligatorio.');
      return;
    }
    const payload = {
      nombre: agregadoForm.nombre.trim(),
      descripcion: agregadoForm.descripcion.trim(),
      precio: agregadoForm.precio === '' ? null : Number(agregadoForm.precio),
      grupos: agregadoForm.grupos || [],
      grupo: (agregadoForm.grupos || [])[0] || null,
      categorias: agregadoForm.categorias || [],
      productos: agregadoForm.productos || []
    };
    try {
      if (agregadoEditId) {
        await editarAgregado(agregadoEditId, payload);
        setInfo('Agregado actualizado.');
      } else {
        await crearAgregado(payload);
        setInfo('Agregado creado.');
      }
      setAgregadoOpen(false);
      setAgregadoForm(emptyAgregado);
      setAgregadoEditId('');
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo guardar el agregado.');
    }
  };

  const borrarAgregado = async (id) => {
    if (!puedeEliminar) return;
    if (!window.confirm('Seguro que deseas eliminar este agregado?')) return;
    try {
      await eliminarAgregado(id);
      setInfo('Agregado eliminado.');
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo eliminar el agregado.');
    }
  };

  const abrirClonar = () => {
    setCloneOpen(true);
    setCloneLocal('');
    setCloneAgregados([]);
    setCloneAgregadoId('');
    setCloneAll(false);
    setError('');
  };

  const ejecutarClonado = async () => {
    if (!cloneLocal || (!cloneAll && !cloneAgregadoId)) {
      setError('Selecciona local origen y agregado a clonar.');
      return;
    }
    try {
      setCloneLoading(true);
      const res = await clonarAgregados({
        sourceLocalId: cloneLocal,
        agregadoId: cloneAll ? null : cloneAgregadoId,
        clonarTodas: cloneAll
      });
      const cantidad = Number(res?.data?.cantidad || 0);
      setInfo(`Agregados clonados correctamente (${cantidad}).`);
      setCloneOpen(false);
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudieron clonar los agregados.');
    } finally {
      setCloneLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2, px: 1 }}>
      <Paper elevation={0} sx={{ p: 3, backgroundColor: 'transparent', boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" gutterBottom>Agregados</Typography>
            <Typography variant="body2" color="text.secondary">
              Crea extras y asocialos por producto o categoria.
            </Typography>
          </Box>
          {puedeCrearEditar && (
            <Stack direction="row" spacing={1}>
              {usuario?.rol === 'superadmin' && (
                <Button variant="outlined" onClick={abrirClonar}>Clonar desde otro local</Button>
              )}
              <Button variant="outlined" onClick={openCrearGrupo}>Crear grupo</Button>
              <Button variant="contained" onClick={openCrearAgregado}>Crear agregado</Button>
            </Stack>
          )}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

        <Typography variant="subtitle1" sx={{ mb: 1 }}>Categorias de agregados</Typography>
        <Table size="small" sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Titulo categoria</TableCell>
              <TableCell>Titulos de agregado</TableCell>
              <TableCell>Opciones</TableCell>
              <TableCell align="right">Abrir</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categoriasAgrupadas.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">Sin categorias de agregados</TableCell></TableRow>
            ) : (
              categoriasAgrupadas.map((categoria) => (
                <TableRow key={categoria.nombre} selected={categoria.nombre === categoriaActiva}>
                  <TableCell>{categoria.nombre}</TableCell>
                  <TableCell>{categoria.grupos.length}</TableCell>
                  <TableCell>{categoria.totalOpciones}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setCategoriaActiva(categoria.nombre)}>
                      Ver titulos
                    </Button>
                  </TableCell>
                  <TableCell align="right">
                    {puedeCrearEditar && (
                      <IconButton size="small" onClick={() => abrirEditarCategoriaAgregados(categoria)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {puedeEliminar && (
                      <IconButton size="small" color="error" onClick={() => borrarCategoriaAgregados(categoria)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 1 }}>
          <Typography variant="subtitle1">
            Titulos de agregado {categoriaActiva ? `- ${categoriaActiva}` : ''}
          </Typography>
          {puedeCrearEditar && (
            <Button variant="outlined" size="small" onClick={openCrearGrupo}>
              Crear titulo de agregado
            </Button>
          )}
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Titulo</TableCell>
              <TableCell>Tipo seleccion</TableCell>
              <TableCell>Campo</TableCell>
              <TableCell>Descripcion</TableCell>
              <TableCell>Opciones dentro del titulo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gruposCategoriaActiva.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">Sin titulos de agregado en esta categoria</TableCell></TableRow>
            ) : (
              gruposCategoriaActiva.map((grupo) => (
                <TableRow key={grupo._id}>
                  <TableCell>{grupo.titulo}</TableCell>
                  <TableCell>{grupo.modoSeleccion === 'unico' ? 'Radio (uno)' : 'Check (muchos)'}</TableCell>
                  <TableCell>{grupo.obligatorio ? 'Obligatorio' : 'Opcional'}</TableCell>
                  <TableCell>{grupo.descripcion || '-'}</TableCell>
                  <TableCell>
                    {(agregadosByGrupo.get(String(grupo._id)) || [])
                      .map((agg) => agg.nombre)
                      .join(', ') || '-'}
                  </TableCell>
                  <TableCell align="right">
                    {puedeCrearEditar && (
                      <IconButton size="small" onClick={() => openEditarGrupo(grupo)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {puedeEliminar && (
                      <IconButton size="small" color="error" onClick={() => borrarGrupo(grupo._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mt: 3, mb: 1 }}>
          <Typography variant="subtitle1">
            Opciones (agregados)
          </Typography>
          {puedeCrearEditar && (
            <Button variant="contained" size="small" onClick={openCrearAgregado}>
              Crear opcion
            </Button>
          )}
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Opcion</TableCell>
              <TableCell>Titulo</TableCell>
              <TableCell>Precio</TableCell>
              <TableCell>Categorias asociadas</TableCell>
              <TableCell>Productos asociados</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agregados.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">Sin opciones</TableCell></TableRow>
            ) : (
              agregados.map((agregado) => (
                <TableRow key={agregado._id}>
                  <TableCell>{agregado.nombre}</TableCell>
                  <TableCell>
                    {Array.from(
                      new Set(
                        [
                          ...((agregado.grupos || []).map((g) => g?.titulo || '')),
                          ...(agregado.grupo?.titulo ? [agregado.grupo.titulo] : [])
                        ].filter(Boolean)
                      )
                    ).join(', ') || '-'}
                  </TableCell>
                  <TableCell>{agregado.precio === null || agregado.precio === undefined ? '-' : agregado.precio}</TableCell>
                  <TableCell>{(agregado.categorias || []).map((c) => c.nombre).join(', ') || '-'}</TableCell>
                  <TableCell>
                    {(agregado.productos || [])
                      .map((p) => p?.productoBase?.nombre || p?.nombre)
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </TableCell>
                  <TableCell align="right">
                    {puedeCrearEditar && (
                      <IconButton size="small" onClick={() => openEditarAgregado(agregado)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {puedeEliminar && (
                      <IconButton size="small" color="error" onClick={() => borrarAgregado(agregado._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={categoriaEditOpen} onClose={() => setCategoriaEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Editar categoria de agregados</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Categoria principal"
              value={categoriaEditNombre}
              onChange={(e) => setCategoriaEditNombre(e.target.value)}
              helperText="Este cambio se aplicara a todos los titulos dentro de esta categoria"
            >
              <MenuItem value="">Sin categoria principal</MenuItem>
              {categoriaPrincipalOptions.map((catNombre) => (
                <MenuItem key={`categoria-edit-${catNombre}`} value={catNombre}>
                  {catNombre}
                </MenuItem>
              ))}
              {hasLegacyCategoriaEdit && (
                <MenuItem value={categoriaEditNombre}>
                  {categoriaEditNombre} (actual)
                </MenuItem>
              )}
            </TextField>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Titulos: {categoriaEditData?.grupos?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Opciones: {categoriaEditOpcionesCount}
              </Typography>
            </Stack>

            <Typography variant="subtitle2">Datos actuales de la categoria</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Titulo</TableCell>
                  <TableCell>Tipo seleccion</TableCell>
                  <TableCell>Campo</TableCell>
                  <TableCell>Descripcion</TableCell>
                  <TableCell>Opciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!categoriaEditData?.grupos || categoriaEditData.grupos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">Sin titulos en esta categoria</TableCell>
                  </TableRow>
                ) : (
                  categoriaEditData.grupos.map((grupo) => (
                    <TableRow key={`categoria-edit-grupo-${grupo._id}`}>
                      <TableCell>{grupo.titulo || '-'}</TableCell>
                      <TableCell>{grupo.modoSeleccion === 'unico' ? 'Radio (uno)' : 'Check (muchos)'}</TableCell>
                      <TableCell>{grupo.obligatorio ? 'Obligatorio' : 'Opcional'}</TableCell>
                      <TableCell>{grupo.descripcion || '-'}</TableCell>
                      <TableCell>
                        {(agregadosByGrupo.get(String(grupo._id)) || [])
                          .map((agg) => agg.nombre)
                          .join(', ') || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoriaEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarEdicionCategoriaAgregados}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={grupoOpen} onClose={() => setGrupoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{grupoEditId ? 'Editar grupo' : 'Crear grupo'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Categoria principal"
              value={grupoForm.categoriaPrincipal}
              onChange={(e) =>
                setGrupoForm((prev) => ({ ...prev, categoriaPrincipal: e.target.value }))
              }
              helperText="Selecciona la categoria de productos donde aplica este titulo"
            >
              <MenuItem value="">Sin categoria principal</MenuItem>
              {categoriaPrincipalOptions.map((catNombre) => (
                <MenuItem key={catNombre} value={catNombre}>{catNombre}</MenuItem>
              ))}
              {hasLegacyCategoriaPrincipal && (
                <MenuItem value={grupoForm.categoriaPrincipal}>
                  {grupoForm.categoriaPrincipal} (actual)
                </MenuItem>
              )}
            </TextField>
            <TextField
              label="Titulo"
              value={grupoForm.titulo}
              onChange={(e) => setGrupoForm((prev) => ({ ...prev, titulo: e.target.value }))}
            />
            <TextField
              label="Descripcion"
              value={grupoForm.descripcion}
              onChange={(e) => setGrupoForm((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
            <TextField
              select
              label="Tipo de seleccion"
              value={grupoForm.modoSeleccion}
              onChange={(e) => setGrupoForm((prev) => ({ ...prev, modoSeleccion: e.target.value }))}
            >
              <MenuItem value="multiple">Check (permite elegir varios)</MenuItem>
              <MenuItem value="unico">Radio (permite elegir uno)</MenuItem>
            </TextField>
            <TextField
              select
              label="Campo"
              value={grupoForm.obligatorio ? 'obligatorio' : 'opcional'}
              onChange={(e) =>
                setGrupoForm((prev) => ({
                  ...prev,
                  obligatorio: e.target.value === 'obligatorio'
                }))
              }
              helperText="Si no eliges nada, queda como opcional por defecto"
            >
              <MenuItem value="opcional">Opcional</MenuItem>
              <MenuItem value="obligatorio">Obligatorio</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrupoOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarGrupo}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={agregadoOpen} onClose={() => setAgregadoOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{agregadoEditId ? 'Editar agregado' : 'Crear agregado'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={agregadoForm.nombre}
              onChange={(e) => setAgregadoForm((prev) => ({ ...prev, nombre: e.target.value }))}
            />
            <TextField
              label="Descripcion"
              value={agregadoForm.descripcion}
              onChange={(e) => setAgregadoForm((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
            <TextField
              label="Precio (opcional)"
              type="number"
              value={agregadoForm.precio}
              onChange={(e) => setAgregadoForm((prev) => ({ ...prev, precio: e.target.value }))}
            />
            <TextField
              select
              SelectProps={{ multiple: true }}
              label="Titulos (opcional)"
              value={agregadoForm.grupos}
              onChange={(e) => setAgregadoForm((prev) => ({ ...prev, grupos: e.target.value }))}
            >
              {grupos.map((g) => (
                <MenuItem key={g._id} value={g._id}>{g.titulo}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              SelectProps={{ multiple: true }}
              label="Categorias asociadas"
              value={agregadoForm.categorias}
              onChange={(e) => setAgregadoForm((prev) => ({ ...prev, categorias: e.target.value }))}
            >
              {categorias.map((c) => (
                <MenuItem key={c._id} value={c._id}>{c.nombre}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              SelectProps={{ multiple: true }}
              label="Productos asociados"
              value={agregadoForm.productos}
              onChange={(e) => setAgregadoForm((prev) => ({ ...prev, productos: e.target.value }))}
            >
              {productosOptions.map((p) => (
                <MenuItem key={p._id} value={p._id}>{p.nombre}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAgregadoOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarAgregado}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cloneOpen} onClose={() => setCloneOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Clonar agregados desde otro local</DialogTitle>
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
              {locales
                .filter((local) => local._id !== selectedLocal?._id)
                .map((local) => (
                  <MenuItem key={local._id} value={local._id}>
                    {local.nombre}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              label="Agregado a clonar"
              value={cloneAgregadoId}
              onChange={(e) => setCloneAgregadoId(e.target.value)}
              disabled={!cloneLocal || cloneAll}
            >
              <MenuItem value="">
                {cloneLocal ? 'Selecciona un agregado' : 'Selecciona un local primero'}
              </MenuItem>
              {cloneAgregados.map((agg) => (
                <MenuItem key={agg._id} value={agg._id}>
                  {agg.nombre}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={cloneAll}
                  onChange={(e) => setCloneAll(e.target.checked)}
                  disabled={!cloneLocal}
                />
              }
              label="Clonar todos los agregados del local"
            />
            <Typography variant="caption" color="text.secondary">
              Se clonan nombre, descripcion, precio y grupo. Las asociaciones por categoria y producto quedan vacias.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={ejecutarClonado} disabled={cloneLoading}>
            {cloneLoading ? 'Clonando...' : 'Clonar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
