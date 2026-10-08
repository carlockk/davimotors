// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // azul pastel
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#43a047', // verde pastel
    },
    error: {
      main: '#e53935', // rojo pastel
    },
    background: {
      default: '#ffffff',
      paper: '#f8f9fb',
    },
    text: {
      primary: '#212121',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: `'Inter', 'Helvetica', 'Arial', sans-serif`,
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
