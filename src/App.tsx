import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppRouter from '@/router/Router';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1E3A8A', // AXiM Primary (Blue/Brand)
    },
    secondary: {
      main: '#F59E0B', // AXiM Secondary (Accent Warning Yellow/Gold)
    },
    success: {
      main: '#10B981', // Accent Success (Green)
    },
    error: {
      main: '#EF4444', // Accent Danger (Red)
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppRouter />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
