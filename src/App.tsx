import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
// Import components
import ErrorBoundary from '@/components/ErrorBoundary';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import TerritoryManagement from '@/pages/TerritoryManagement';
import LeadManagement from '@/pages/LeadManagement';
import RepTurf from '@/pages/RepTurf';
import AnalyticsPage from '@/pages/AnalyticsPage';
import TeamManagementPage from '@/pages/TeamManagementPage';
import PerformancePage from '@/pages/PerformancePage';
import SettingsPage from '@/pages/SettingsPage';
import UserProfile from '@/pages/UserProfile';
import Navbar from '@/components/Navbar';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

import { useAuth } from '@/contexts/AuthContext';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main Layout component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
};

// Define a reusable layout for protected pages
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/territories" element={<ProtectedLayout><TerritoryManagement /></ProtectedLayout>} />
          <Route path="/leads" element={<ProtectedLayout><LeadManagement /></ProtectedLayout>} />
          <Route path="/turf" element={<ProtectedLayout><RepTurf /></ProtectedLayout>} />
          <Route path="/analytics" element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />
          <Route path="/team" element={<ProtectedLayout><TeamManagementPage /></ProtectedLayout>} />
          <Route path="/performance" element={<ProtectedLayout><PerformancePage /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><UserProfile /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;