import React, { useEffect, useState } from 'react';
import { Box, Snackbar, Alert, Typography } from '@mui/material';
import Navbar from '@/components/Navbar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  useEffect(() => {
    // Check token expiration periodically
    const checkToken = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const exp = payload.exp * 1000;
          const now = Date.now();
          // If token expires in less than 5 minutes (300,000 ms) and is still valid
          if (exp - now < 300000 && exp - now > 0) {
            setShowSessionWarning(true);
          } else {
            setShowSessionWarning(false);
          }
        } catch (e) {
          // ignore parsing errors
        }
      } else {
        setShowSessionWarning(false);
      }
    };

    checkToken();
    const tokenInterval = setInterval(checkToken, 60000); // check every minute

    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      setSyncCount(customEvent.detail.count);
      setIsSyncing(false);
    };

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setIsSyncing(true);
      // It will eventually fire offline-sync-complete
      setTimeout(() => setIsSyncing(false), 3000); // Fallback to hide 'Syncing...' banner
    };

    window.addEventListener('offline-sync-complete', handleSyncComplete);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(tokenInterval);
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSyncCount(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {showSessionWarning && (
         <Box
           sx={{
             bgcolor: 'warning.main',
             color: 'warning.contrastText',
             textAlign: 'center',
             py: 0.5,
             position: 'sticky',
             top: 0,
             zIndex: 1200
           }}
         >
           <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
             Warning: Your session expires in less than 5 minutes. Please save work and refresh to avoid data loss when going offline.
           </Typography>
         </Box>
      )}
      <Navbar />
      {(isOffline || isSyncing) && (
        <Box
          sx={{
            bgcolor: isOffline ? '#F59E0B' : 'success.main',
            color: 'white',
            textAlign: 'center',
            py: 0.5,
            position: 'sticky',
            top: showSessionWarning ? 30 : 0,
            zIndex: 1100,
            transition: 'background-color 0.3s ease'
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {isOffline ? 'Offline Mode: Changes are saving locally.' : 'Online: Syncing...'}
          </Typography>
        </Box>
      )}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
      <Snackbar open={syncCount !== null} autoHideDuration={6000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
          All local changes synced to server.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;
