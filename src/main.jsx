import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './styles/index.css'
import App from './App.jsx'

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    background: {
      default: 'transparent',
      paper: 'transparent',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          background: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          color: '#0f172a',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.6)',
            boxShadow: '0 6px 12px rgba(0,0,0,0.1)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.6)',
          color: '#0f172a',
          borderWidth: '2px',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderWidth: '2px',
          }
        }
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
          color: '#0f172a',
        },
        head: {
          fontWeight: 700,
          background: 'rgba(255, 255, 255, 0.2)',
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(4px)',
          borderRadius: '8px',
          '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.6)',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.9)',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#2563eb',
          },
        },
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>
)
