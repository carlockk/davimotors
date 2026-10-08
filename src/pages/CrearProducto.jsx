import { Box, Paper, Typography } from '@mui/material';
import ProductoForm from '../components/ProductoForm';

export default function CrearProducto() {
  return (
    <Box sx={{ mt: 4, px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 640,
          mx: 'auto',
          p: 4,
          backgroundColor: 'transparent',
          boxShadow: 'none',
          fontSize: '0.92rem',
          '& .MuiTypography-body1, & .MuiTypography-body2, & .MuiTypography-subtitle2': {
            fontSize: '0.92rem'
          }
        }}
      >
        <Typography variant="h5" gutterBottom align="center">
          Crear Producto
        </Typography>
        <ProductoForm />
      </Paper>
    </Box>
  );
}
