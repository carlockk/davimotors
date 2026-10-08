import {
  Box,
  TextField,
  InputAdornment,
  MenuItem,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearAllIcon from '@mui/icons-material/ClearAll';

export default function BuscadorProducto({
  busqueda,
  setBusqueda,
  filtroCategoria,
  setFiltroCategoria,
  categorias = [],
  precioMin,
  setPrecioMin,
  precioMax,
  setPrecioMax,
  stockMin,
  setStockMin
}) {
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCategoria('');
    setPrecioMin?.('');
    setPrecioMax?.('');
    setStockMin?.('');
  };

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
      <TextField
        placeholder="Buscar por nombre"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          )
        }}
        size="small"
      />

      <TextField
        select
        label="Categoría"
        value={filtroCategoria}
        onChange={(e) => setFiltroCategoria(e.target.value)}
        size="small"
        sx={{ minWidth: 160 }}
      >
        <MenuItem value="">Todas</MenuItem>
        {categorias.map((cat) => (
          <MenuItem key={cat._id} value={cat._id}>
            {cat.label || cat.nombre}
          </MenuItem>
        ))}
      </TextField>

      {setPrecioMin && setPrecioMax && (
        <>
          <TextField
            label="Precio Mín"
            type="number"
            value={precioMin}
            onChange={(e) => setPrecioMin(e.target.value)}
            size="small"
            sx={{ width: 120 }}
          />
          <TextField
            label="Precio Máx"
            type="number"
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            size="small"
            sx={{ width: 120 }}
          />
        </>
      )}

      {setStockMin && (
        <TextField
          label="Stock Mín"
          type="number"
          value={stockMin}
          onChange={(e) => setStockMin(e.target.value)}
          size="small"
          sx={{ width: 120 }}
        />
      )}

      <Button
        onClick={limpiarFiltros}
        variant="outlined"
        color="error"
        size="small"
        startIcon={<ClearAllIcon />}
        sx={{ alignSelf: 'center', textTransform: 'none', fontWeight: 600 }}
      >
        Limpiar
      </Button>
    </Box>
  );
}
