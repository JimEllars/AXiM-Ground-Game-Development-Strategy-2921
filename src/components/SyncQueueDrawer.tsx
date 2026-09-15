import React, { useState, useEffect } from 'react';
import { Drawer, Box, Typography, Button, List, ListItem, ListItemText, ListItemIcon, IconButton, Alert, CircularProgress, Chip } from '@mui/material';
import { FiX, FiRefreshCw, FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleSyncComplete = () => {
      fetchQueue();
      setLastSync(new Date());
    };
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    return () => window.removeEventListener('offline-sync-complete', handleSyncComplete);
  }, []);

  const fetchQueue = async () => {
    try {
      const interactions = await db.interactions.toArray();
      // Only show things that are not completely synced successfully
      setOfflineInteractions(interactions.filter(i => i.synced !== 1));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchQueue();
    }
  }, [open]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection. Cannot reach Cloudflare Edge.');
      }

      await syncOfflineData();
      await fetchQueue();
    } catch (err: any) {
      setError(err.message || 'Failed to sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResolveConflict = async (id: number) => {
    // Basic manual resolution: reset to pending
    await db.interactions.update(id, { synced: 0 as any, failCount: 0 });
    await fetchQueue();
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 3, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" color="text.primary">Offline Sync Queue</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Chip
                label={isOnline ? 'Live' : 'Offline'}
                size="small"
                color={isOnline ? 'success' : 'error'}
                variant="filled"
                sx={{ height: 20, fontWeight: 'bold' }}
              />

            </Box>
            {lastSync && (
              <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5 }}>
                Last sync: {lastSync?.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} size="small"><SafeIcon icon={FiX} /></IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
            Pending Items ({offlineInteractions.length})
          </Typography>

          <List sx={{ p: 0, gap: 2, display: 'flex', flexDirection: 'column' }}>
            {offlineInteractions.map(item => {
              let Icon = FiClock;
              let iconColor = 'warning.main';
              let statusText = 'Pending';
              let statusColor: 'warning' | 'error' | 'info' | 'success' | 'default' = 'warning';

              if (item.synced === -1 || item.synced === 'failed') {
                Icon = FiAlertCircle;
                iconColor = 'error.main';
                statusColor = 'error';
                statusText = 'Failed';
                if (item.supportReported) statusText += ' (Reported)';
              } else if (item.synced === 'duplicate') {
                 Icon = FiCheckCircle;
                 iconColor = 'success.main';
                 statusColor = 'success';
                 statusText = 'Duplicate (Resolved)';
              } else if (item.synced === 'retrying') {
                 Icon = FiRefreshCw;
                 iconColor = 'warning.main';
                 statusColor = 'warning';
                 statusText = 'Retrying';
              } else if (isSyncing) {
                Icon = FiRefreshCw;
                iconColor = 'info.main';
                statusColor = 'info';
                statusText = 'In-Flight';
              }

              return (
              <Box key={item.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                    <SafeIcon icon={Icon} style={{ color: iconColor, animation: isSyncing && (item.synced === 0 || item.synced === 'retrying') ? 'spin 2s linear infinite' : 'none' }} />
                  </ListItemIcon>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="bold">Lead: {item.leadId}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {item.outcome} • {new Date(item.interactionDate).toLocaleTimeString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={statusText}
                    size="small"
                    color={statusColor}
                    variant="filled"
                    sx={{
                      fontWeight: 'bold',
                      color: statusColor === 'warning' ? '#000' : '#fff',
                      boxShadow: 1
                    }}
                  />
                </Box>

                {(item.synced === 'failed' || item.synced === -1) && (
                   <Button size="small" variant="text" color="primary" onClick={() => handleResolveConflict(item.id)} sx={{ mt: 1, ml: 4 }}>
                     Retry Sync
                   </Button>
                )}
              </Box>
            )})}

            {offlineInteractions.length === 0 && (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                <Typography color="text.secondary">All caught up!</Typography>
              </Box>
            )}
          </List>
          <style>{`
            @keyframes spin {
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </Box>

        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            startIcon={isSyncing ? <CircularProgress size={20} color="inherit" /> : <SafeIcon icon={FiRefreshCw} />}
            onClick={handleForceSync}
            disabled={isSyncing || offlineInteractions.length === 0}
            sx={{ borderRadius: 2, py: 1.5 }}
          >
            {isSyncing ? 'Syncing with Edge...' : 'Force Sync Queue'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default SyncQueueDrawer;
