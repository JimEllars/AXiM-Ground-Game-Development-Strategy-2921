import React, { useEffect, useState } from 'react';
import { Box, Snackbar, Alert, Typography } from '@mui/material';
import Navbar from '@/components/Navbar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
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
      <Navbar />
      {(isOffline || isSyncing) && (
        <Box
          sx={{
            bgcolor: isOffline ? '#F59E0B' : 'success.main',
            color: 'white',
            textAlign: 'center',
            py: 0.5,
            position: 'sticky',
            top: 0,
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
