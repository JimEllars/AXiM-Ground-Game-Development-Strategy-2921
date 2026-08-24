import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import FleetHealthModal from './FleetHealthModal';

export default function DashboardHeader({ title, fleetData }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4">{title}</Typography>
      <Button variant="outlined" color="primary" onClick={() => setModalOpen(true)}>
        Fleet Health & Actions
      </Button>
      <FleetHealthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fleetData={fleetData || [
          { device_id: 'DEV-001', rep_name: 'Alice S.', battery: 12, latency: 45, incident_status: 'normal' },
          { device_id: 'DEV-002', rep_name: 'Bob J.', battery: 85, latency: 600, incident_status: 'normal' },
          { device_id: 'DEV-003', rep_name: 'Charlie M.', battery: 50, latency: 30, incident_status: 'escalated_to_central_support' }
        ]}
      />
    </Box>
  );
}
