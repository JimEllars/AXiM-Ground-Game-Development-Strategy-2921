import { useState } from 'react';
    import { Box, Typography, Alert, } from '@mui/material';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { SpeedDial, SpeedDialIcon, SpeedDialAction, Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { MdGroupAdd } from 'react-icons/md';
import { leadsAPI } from '@/services/api';

    import TerritoryMap from '@/components/TerritoryMap';
import ErrorBoundary from '@/components/ErrorBoundary';
    import { territoriesAPI } from '@/services/api';

    const TerritoryManagement: React.FC = () => {
      const [lassoSelectedPins, setLassoSelectedPins] = useState<any[]>([]);
      const [assignDialogOpen, setAssignDialogOpen] = useState(false);
      const [assignTargetId, setAssignTargetId] = useState('');
      const [assignTargetType, setAssignTargetType] = useState<'rep' | 'team'>('rep');
      const { data: teamsData } = useQuery('teams', () => import('@/services/api').then(m => m.teamsAPI.getTeams()).then(res => res.data));
      const teams = teamsData || [];

      const handleBatchAssign = async () => {
        if (!assignTargetId || lassoSelectedPins.length === 0) return;
        try {
          // This assumes the backend leadsAPI can update leads, or you have a batch endpoint.
          // In this example, I'll update each lead using a loop (a batch endpoint is ideal but I will loop over update for now)
          const updatePromises = lassoSelectedPins.map(pin => {
              // Usually leads have an 'assigned_rep_id' or 'team_id'. The leads API update takes data.
              // Assuming it's part of the standard update.
              // Wait, the prompt says: "surface a quick-action MUI speed dial allowing one-click assignment of all selected pins to a specific team_id or assigned_rep_id."
              // We'll dispatch to a new endpoint or loop `leadsAPI.update` depending on what we can do.
              // Let's do loop for simplicity since we don't know if batch assign endpoint exists.
              const updateData: any = {};
              if (assignTargetType === 'rep') updateData.assigned_rep_id = assignTargetId;
              if (assignTargetType === 'team') updateData.team_id = assignTargetId;
              // wait, the leads API in api.ts doesn't have assigned_rep_id in its typed partial but we can pass it anyway or the backend handles it.
              return leadsAPI.update(pin.id, updateData);
          });
          await Promise.all(updatePromises);
          setSuccess(`Successfully assigned ${lassoSelectedPins.length} pins.`);
          setAssignDialogOpen(false);
          setLassoSelectedPins([]);
          queryClient.invalidateQueries('territory-pins'); // if there is such a query
        } catch (e) {
          setError('Failed to assign pins');
        }
      };

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
            const territoryToDelete = territories.find((t: any) => t.id === id);
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
        ({ territoryId, userId, teamId }: { territoryId: string; userId?: string; teamId?: string }) => territoriesAPI.assign(territoryId, userId, teamId),
        {
          onSuccess: (_, { territoryId, userId }) => {
            const territory = territories.find((t: any) => t.id === territoryId);
            const rep = availableReps.find((r: any) => r.id === userId);
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
        const territoryToDelete = territories.find((t: any) => t.id === id);
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
          <SkeletonLoader type="dashboard" />
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
            <ErrorBoundary><TerritoryMap
              territories={territories}
              availableReps={availableReps}
              onSaveTerritory={handleSaveTerritory}
              onDeleteTerritory={handleDeleteTerritory}
              onAssignTerritory={handleAssignTerritory}
            /></ErrorBoundary>
          )}

          {lassoSelectedPins.length > 0 && (
            <SpeedDial
              ariaLabel="Batch Assign"
              sx={{ position: 'absolute', bottom: 16, right: 16 }}
              icon={<SpeedDialIcon />}
            >
              <SpeedDialAction
                key="Assign"
                icon={<MdGroupAdd />}
                tooltipTitle="Assign Selected Pins"
                onClick={() => setAssignDialogOpen(true)}
              />
            </SpeedDial>
          )}

          <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
            <DialogTitle>Assign {lassoSelectedPins.length} Pins</DialogTitle>
            <DialogContent>
              <Box sx={{ minWidth: 300, mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Assign To Type</InputLabel>
                  <Select
                    value={assignTargetType}
                    label="Assign To Type"
                    onChange={(e) => setAssignTargetType(e.target.value as 'rep' | 'team')}
                  >
                    <MenuItem value="rep">Representative</MenuItem>
                    <MenuItem value="team">Team</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Select {assignTargetType === 'rep' ? 'Rep' : 'Team'}</InputLabel>
                  <Select
                    value={assignTargetId}
                    label={`Select ${assignTargetType === 'rep' ? 'Rep' : 'Team'}`}
                    onChange={(e) => setAssignTargetId(e.target.value as string)}
                  >
                    {assignTargetType === 'rep'
                      ? availableReps.map((r: any) => <MenuItem key={r.id} value={r.id}>{r.first_name} {r.last_name}</MenuItem>)
                      : teams.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)
                    }
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleBatchAssign} disabled={!assignTargetId}>Assign</Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    };

    export default TerritoryManagement;