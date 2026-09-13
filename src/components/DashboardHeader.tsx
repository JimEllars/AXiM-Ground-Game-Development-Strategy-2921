import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Badge, Chip } from '@mui/material';
import FleetHealthModal, { FleetDeviceData } from './FleetHealthModal';
import { useSSE } from '@/hooks/useSSE';
import { getPendingSyncCount } from '@/syncEngine';


export interface DashboardHeaderProps {
  title: string;
  fleetData?: FleetDeviceData[];
}

export default function DashboardHeader({ title, fleetData }: DashboardHeaderProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [liveFleetData, setLiveFleetData] = useState<FleetDeviceData[]>(fleetData || [
    { device_id: 'DEV-001', rep_name: 'Alice S.', battery: 12, latency: 45, incident_status: 'normal' },
    { device_id: 'DEV-002', rep_name: 'Bob J.', battery: 85, latency: 600, incident_status: 'normal' },
    { device_id: 'DEV-003', rep_name: 'Charlie M.', battery: 50, latency: 30, incident_status: 'escalated_to_central_support' }
  ]);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const fetchSyncCount = async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingSyncCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSyncCount();
    const interval = setInterval(fetchSyncCount, 5000);
    return () => clearInterval(interval);
  }, []);


  // Ensure config.ts API_URL or a proxy path is used
  const sseUrl = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/sse/fleet-health`
    : '/api/sse/fleet-health';

  const { data, error } = useSSE(sseUrl);

  useEffect(() => {
    if (data) {
      if (data.type === 'CONNECTED') {
        setConnectionStatus('connected');
      } else if (data.type === 'FLEET_HEALTH_UPDATE') {
        // Update live fleet data based on SSE pulse
        if (data.payload && Array.isArray(data.payload)) {
          setLiveFleetData(data.payload);
        }
      }
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      setConnectionStatus('disconnected');
    }
  }, [error]);


  useEffect(() => {
    const handleSyncComplete = () => {
      setConnectionStatus('connected');
    };
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    return () => window.removeEventListener('offline-sync-complete', handleSyncComplete);
  }, []);

  const escalatedCount = liveFleetData.filter(d => d.incident_status === 'escalated_to_central_support').length;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4">{title}</Typography>
        <Chip
          label={connectionStatus === 'connected' ? 'Online (Edge Connected)' : connectionStatus === 'reconnecting' ? 'Reconnecting' : 'Offline (Local Sync Active)'}
          color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'reconnecting' ? 'warning' : 'error'}
          size="small"
        />
        {pendingSyncCount > 0 && (
          <Chip label={`${pendingSyncCount} pending syncs`} color="secondary" size="small" />
        )}
      </Box>
      <Badge badgeContent={escalatedCount} color="error">
        <Button variant="outlined" color="primary" onClick={() => setModalOpen(true)}>
          Fleet Health & Actions
        </Button>
      </Badge>
      <FleetHealthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fleetData={liveFleetData}
      />
    </Box>
  );
}
