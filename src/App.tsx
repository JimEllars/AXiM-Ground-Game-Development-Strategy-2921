import React from 'react';
    import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

    // Protected Route component
    const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const token = localStorage.getItem('token');
      return token ? <>{children}</> : <Navigate to="/login" replace />;
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

    function App() {
      return (
        <ErrorBoundary>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/territories"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <TerritoryManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leads"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <LeadManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/turf"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <RepTurf />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <AnalyticsPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <TeamManagementPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/performance"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <PerformancePage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <SettingsPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </ThemeProvider>
        </ErrorBoundary>
      );
    }

    export default App;