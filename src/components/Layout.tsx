import React, { useEffect, useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import Navbar from '@/components/Navbar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncCount, setSyncCount] = useState<number | null>(null);

  useEffect(() => {
    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      setSyncCount(customEvent.detail.count);
    };

    window.addEventListener('offline-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
    };
  }, []);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSyncCount(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
      <Snackbar open={syncCount !== null} autoHideDuration={6000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
          Offline Sync Complete: ${syncCount} interactions synced.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;
