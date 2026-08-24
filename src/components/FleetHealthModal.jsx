import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Box,
  Typography,
  Chip
} from '@mui/material';

export default function FleetHealthModal({ open, onClose, fleetData = [] }) {
  const [selectedDevices, setSelectedDevices] = useState([]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDevices(fleetData.map(d => d.device_id));
    } else {
      setSelectedDevices([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedDevices(prev => [...prev, id]);
    } else {
      setSelectedDevices(prev => prev.filter(d => d !== id));
    }
  };

  const handleBulkAction = (action) => {
    // In a real app, this would dispatch to the command queue API
    console.log(`Dispatching ${action} to devices:`, selectedDevices);
    // e.g. dispatchToCommandQueue({ devices: selectedDevices, command: action })
    setSelectedDevices([]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Fleet Health & Edge Bulk Actions</DialogTitle>
      <DialogContent>
        {selectedDevices.length > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              {selectedDevices.length} device(s) selected
            </Typography>
            <Button variant="contained" size="small" onClick={() => handleBulkAction('Bulk Reissue Ephemeral Tokens')}>
              Bulk Reissue Ephemeral Tokens
            </Button>
            <Button variant="outlined" size="small" onClick={() => handleBulkAction('Bulk Clear Address Locks')}>
              Bulk Clear Address Locks
            </Button>
          </Box>
        )}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={fleetData.length > 0 && selectedDevices.length === fleetData.length}
                  indeterminate={selectedDevices.length > 0 && selectedDevices.length < fleetData.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Device ID</TableCell>
              <TableCell>Rep</TableCell>
              <TableCell>Battery</TableCell>
              <TableCell>Latency</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fleetData.map((device) => {
              const isSelected = selectedDevices.includes(device.device_id);
              return (
                <TableRow key={device.device_id} selected={isSelected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleSelectOne(e, device.device_id)}
                    />
                  </TableCell>
                  <TableCell>{device.device_id}</TableCell>
                  <TableCell>{device.rep_name}</TableCell>
                  <TableCell>
                    <Typography color={device.battery < 15 ? 'error' : 'textPrimary'}>
                      {device.battery}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography color={device.latency > 500 ? 'error' : 'textPrimary'}>
                      {device.latency}ms
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small"
                      color={device.incident_status === 'escalated_to_central_support' ? 'error' : 'success'}
                      label={device.incident_status === 'escalated_to_central_support' ? 'Escalated' : 'OK'} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
