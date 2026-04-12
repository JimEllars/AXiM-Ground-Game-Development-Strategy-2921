import React, { useState } from 'react';
    import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
    import TerritoryMap from '@/components/TerritoryMap';
    import { territoriesAPI } from '@/services/api';

    const TerritoryManagement: React.FC = () => {
      const queryClient = useQueryClient();
      const [error, setError] = useState('');
      const [success, setSuccess] = useState('');

      const { data: territoriesData, isLoading: isLoadingTerritories, error: territoriesError } = useQuery(
        'territories',
        () => territoriesAPI.getAll().then(res => res.data)
      );

      const { data: availableRepsData, isLoading: isLoadingReps, error: repsError } = useQuery(
        'availableReps',
        () => territoriesAPI.getAvailableReps().then(res => res.data)
      );

      const territories = territoriesData || [];
      const availableReps = availableRepsData || [];

      const createMutation = useMutation(
        (data: { name: string; description: string; geoJson: any }) => territoriesAPI.create(data),
        {
          onSuccess: (response) => {
            setSuccess(`Territory "${response.data.name}" created successfully!`);
            setError('');
            queryClient.invalidateQueries('territories');
            setTimeout(() => setSuccess(''), 3000);
          },
          onError: (err: any) => {
            setError(err.response?.data?.error || 'Failed to create territory');
            setSuccess('');
          }
        }
      );

      const deleteMutation = useMutation(
        (id: string) => territoriesAPI.delete(id),
        {
          onSuccess: (_, id) => {
            const territoryToDelete = territories.find(t => t.id === id);
            setSuccess(`Territory "${territoryToDelete?.name || 'Unknown'}" deleted successfully!`);
            setError('');
            queryClient.invalidateQueries('territories');
            setTimeout(() => setSuccess(''), 3000);
          },
          onError: (err: any) => {
            setError(err.response?.data?.error || 'Failed to delete territory');
            setSuccess('');
          }
        }
      );

      const assignMutation = useMutation(
        ({ territoryId, userId }: { territoryId: string; userId: string }) => territoriesAPI.assign(territoryId, userId),
        {
          onSuccess: (_, { territoryId, userId }) => {
            const territory = territories.find(t => t.id === territoryId);
            const rep = availableReps.find(r => r.id === userId);
            setSuccess(`Territory "${territory?.name}" assigned to ${rep?.firstName} ${rep?.lastName} successfully!`);
            setError('');
            queryClient.invalidateQueries('territories');
            setTimeout(() => setSuccess(''), 3000);
          },
          onError: (err: any) => {
            setError(err.response?.data?.error || 'Failed to assign territory');
            setSuccess('');
          }
        }
      );

      const handleSaveTerritory = (data: { name: string; description: string; geoJson: any }) => {
        createMutation.mutate(data);
      };

      const handleDeleteTerritory = (id: string) => {
        const territoryToDelete = territories.find(t => t.id === id);
        if (!territoryToDelete) return;

        if (!window.confirm(`Are you sure you want to delete the territory "${territoryToDelete.name}"? This action will NOT delete the leads within the territory.`)) {
          return;
        }
        deleteMutation.mutate(id);
      };

      const handleAssignTerritory = (territoryId: string, userId: string) => {
        assignMutation.mutate({ territoryId, userId });
      };

      const loading = isLoadingTerritories || isLoadingReps;
      const displayError = error || (territoriesError as any)?.response?.data?.error || (repsError as any)?.response?.data?.error;

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
          {displayError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {displayError}
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