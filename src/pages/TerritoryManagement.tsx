import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import TerritoryMap from '../components/TerritoryMap';
import { territoriesAPI } from '../services/api';

const TerritoryManagement: React.FC = () => {
  const [territories, setTerritories] = useState<any[]>([]);
  const [availableReps, setAvailableReps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [territoriesResponse, repsResponse] = await Promise.all([
        territoriesAPI.getAll(),
        territoriesAPI.getAvailableReps()
      ]);
      setTerritories(territoriesResponse.data);
      setAvailableReps(repsResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load territories');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTerritory = async (data: { name: string; description: string; geoJson: any }) => {
    try {
      await territoriesAPI.create(data);
      setSuccess('Territory created successfully!');
      setError('');
      loadData(); // Reload territories
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create territory');
      setSuccess('');
    }
  };

  const handleDeleteTerritory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this territory?')) {
      return;
    }

    try {
      await territoriesAPI.delete(id);
      setSuccess('Territory deleted successfully!');
      setError('');
      loadData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete territory');
      setSuccess('');
    }
  };

  const handleAssignTerritory = async (territoryId: string, userId: string) => {
    try {
      await territoriesAPI.assign(territoryId, userId);
      setSuccess('Territory assigned successfully!');
      setError('');
      loadData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign territory');
      setSuccess('');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Territory Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Create and manage territories for your canvassing teams. Draw polygons on the map to define territory boundaries.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <TerritoryMap
        territories={territories}
        availableReps={availableReps}
        onSaveTerritory={handleSaveTerritory}
        onDeleteTerritory={handleDeleteTerritory}
        onAssignTerritory={handleAssignTerritory}
      />
    </Box>
  );
};

export default TerritoryManagement;