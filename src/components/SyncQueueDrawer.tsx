import React, { useState, useEffect } from 'react';
import { Drawer, Box, Typography, Button, List, ListItem, ListItemText, Divider, IconButton, Alert, CircularProgress } from '@mui/material';
import { FiX, FiRefreshCw, FiClock, FiAlertCircle } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa';
import SafeIcon from '@/common/SafeIcon';
import { db } from '@/db';
import { syncOfflineData } from '@/syncEngine';

interface SyncQueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SyncQueueDrawer: React.FC<SyncQueueDrawerProps> = ({ open, onClose }) => {
  const [offlineInteractions, setOfflineInteractions] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const interactions = await db.interactions.where('synced').equals(0 as any).toArray();
      setOfflineInteractions(interactions);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchQueue();
    }
  }, [open]);

  useEffect(() => {
    const handleSyncComplete = () => {
      fetchQueue();
    };
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    return () => window.removeEventListener('offline-sync-complete', handleSyncComplete);
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      // test Cloudflare Worker connection
      if (!navigator.onLine) {
        throw new Error('No internet connection. Cannot reach Cloudflare Edge.');
      }

      const res = await fetch('/api/health').catch(() => null);
      if (!res || !res.ok) {
        throw new Error('Cloudflare Edge connection severed or API unavailable.');
      }

      await syncOfflineData();
      await fetchQueue();
    } catch (err: any) {
      setError(err.message || 'Failed to sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 350, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Offline Sync Queue</Typography>
          <IconButton onClick={onClose}><SafeIcon icon={FiX} /></IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <Typography variant="subtitle1" fontWeight="bold">Pending Interactions ({offlineInteractions.length})</Typography>
          <List dense>
            {offlineInteractions.map(item => {
              let Icon = FiClock;
              let iconColor = 'warning.main';
              let statusText = 'Pending';

              if (item.synced === -1) {
                Icon = FiAlertCircle;
                iconColor = 'error.main';
                statusText = 'Failed / Conflict';
                if (item.supportReported) statusText += ' (Reported to Support)';
              } else if (isSyncing) {
                Icon = FiRefreshCw;
                iconColor = 'info.main';
                statusText = 'In-Flight';
              }

              return (
              <ListItem key={item.id}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <SafeIcon icon={Icon} style={{ color: iconColor, animation: isSyncing && item.synced !== -1 ? 'spin 2s linear infinite' : 'none' }} />
                </ListItemIcon>
                <ListItemText
                  primary={`Lead: ${item.leadId} (${statusText})`}
                  secondary={`Outcome: ${item.outcome} | Date: ${new Date(item.interactionDate).toLocaleString()}`}
                />
              </ListItem>
            )})}
            {offlineInteractions.length === 0 && (
              <ListItem><ListItemText secondary="No pending interactions" /></ListItem>
            )}
          </List>
          <style>{`
            @keyframes spin {
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={isSyncing ? <CircularProgress size={20} color="inherit" /> : <SafeIcon icon={FiRefreshCw} />}
            onClick={handleForceSync}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Force Sync to Edge'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default SyncQueueDrawer;
