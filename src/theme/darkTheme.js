// src/theme/darkTheme.js
import { createTheme } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#81c784',
    },
    error: {
      main: '#ef5350',
    },
    background: {
      default: '#121212', // fondo general
      paper: '#1e1e1e',   // tarjetas, inputs
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#b0b0b0',
    },
    divider: '#2c2c2c',
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
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          backgroundColor: '#1e1e1e',
          color: '#e0e0e0'
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#2d2d2d',
          color: '#e0e0e0',
          fontWeight: 'bold',
        },
        body: {
          backgroundColor: '#1e1e1e',
          color: '#e0e0e0',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#1e1e1e',
          color: '#e0e0e0'
        },
      },
    },
  },
});

export default darkTheme;
