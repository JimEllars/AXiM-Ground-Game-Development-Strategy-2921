import React, { useState, useEffect } from 'react';
    import { Box, Typography, Alert, CircularProgress } from '@mui/material';
    import TerritoryMap from '@/components/TerritoryMap';
    import { territoriesAPI } from '@/services/api';
import { Territory, User } from '@/types';

    const TerritoryManagement: React.FC = () => {
      const [territories, setTerritories] = useState<Territory[]>([]);
      const [availableReps, setAvailableReps] = useState<User[]>([]);
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
            territoriesAPI.getAvailableReps(),
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
          const response = await territoriesAPI.create(data);
          setSuccess(`Territory "${response.data.name}" created successfully!`);
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
        const territoryToDelete = territories.find(t => t.id === id);
        if (!territoryToDelete) return;

        if (!window.confirm(`Are you sure you want to delete the territory "${territoryToDelete.name}"? This action will NOT delete the leads within the territory.`)) {
          return;
        }
        try {
          await territoriesAPI.delete(id);
          setSuccess(`Territory "${territoryToDelete.name}" deleted successfully!`);
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
          const territory = territories.find(t => t.id === territoryId);
          const rep = availableReps.find(r => r.id === userId);
          if (!territory || !rep) return;

          await territoriesAPI.assign(territoryId, userId);
          setSuccess(`Territory "${territory.name}" assigned to ${rep.firstName} ${rep.lastName} successfully!`);
          setError('');
          loadData();
          setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
          setError(err.response?.data?.error || `Failed to assign territory "${territoryId}" to user "${userId}"`);
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
            Create and manage territories for your canvassing teams. Draw polygons on the map to define territory
            boundaries.
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
          {!loading && territories && availableReps && (
            <TerritoryMap
              territories={territories}
              availableReps={availableReps}
              onSaveTerritory={handleSaveTerritory}
              onDeleteTerritory={handleDeleteTerritory}
              onAssignTerritory={handleAssignTerritory}
            />
          )}
        </Box>
      );
    };

    export default TerritoryManagement;