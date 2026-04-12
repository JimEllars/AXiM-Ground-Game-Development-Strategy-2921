import React, { useState } from 'react';
    import {
      Grid,
      Paper,
      Typography,
      Box,
      Chip,
      List,
      ListItem,
      ListItemText,
      ListItemIcon,
      Button,
      Alert,
      CircularProgress,
    } from '@mui/material';
    import { FiMap, FiUsers, FiTarget, FiTrendingUp, FiMapPin, FiCheck } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
    import SafeIcon from '@/common/SafeIcon';
    import StatCard from '@/components/StatCard';
    import { repsAPI, interactionsAPI } from '@/services/api';

    const RepDashboard: React.FC = () => {
      const queryClient = useQueryClient();
      const [interactionError, setInteractionError] = useState('');

      const { data: turfData, isLoading: isLoadingTurf, error: turfError } = useQuery(
        'repTurf',
        () => repsAPI.getMyTurf().then(res => res.data.territories)
      );

      const { data: statsData, isLoading: isLoadingStats, error: statsError } = useQuery(
        'repStats',
        () => repsAPI.getStats().then(res => res.data)
      );

      const interactionMutation = useMutation(
        (data: { leadId: string; outcome: string }) =>
          interactionsAPI.create([{ leadId: data.leadId, outcome: data.outcome, notes: '', interactionDate: new Date() }]),
        {
          onSuccess: () => {
            queryClient.invalidateQueries('repTurf');
            queryClient.invalidateQueries('repStats');
            setInteractionError('');
          },
          onError: (error: any) => {
            setInteractionError(error.response?.data?.error || 'Failed to record interaction');
          }
        }
      );

      const territories = turfData || [];
      const stats = statsData || {};
      const loading = isLoadingTurf || isLoadingStats;
      const errorMsg = (turfError as any)?.response?.data?.error || (statsError as any)?.response?.data?.error || interactionError;

      const handleStartInteraction = (leadId: string, outcome: string) => {
        interactionMutation.mutate({ leadId, outcome });
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
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setInteractionError('')}>
              {errorMsg}
            </Alert>
          )}
          <Grid container spacing={3}>
            {/* Stats Cards */}
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Interactions"
                value={stats.totalInteractions || 0}
                icon={FiTarget}
                color="#1976d2"
                subtitle="All-time"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Unique Contacts"
                value={stats.uniqueLeadsContacted || 0}
                icon={FiUsers}
                color="#388e3c"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Active Days" value={stats.activeDays || 0} icon={FiTrendingUp} color="#f57c00" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Territories" value={territories.length} icon={FiMap} color="#7b1fa2" />
            </Grid>

            {/* Territories and Leads */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  My Territories
                </Typography>
                {territories.length > 0 ? (
                  <List>
                    {territories.map((territory) => {
                      const totalLeads = territory.leads.length;
                      const completedLeads = territory.leads.reduce(
                        (count: number, l: any) => count + (l.lastInteraction ? 1 : 0),
                        0
                      );
                      const completionPercentage = totalLeads > 0
                        ? Math.round((completedLeads / totalLeads) * 100)
                        : 0;

                      return (
                        <ListItem key={territory.id} divider>
                          <ListItemIcon>
                            <SafeIcon icon={FiMapPin} />
                          </ListItemIcon>
                          <ListItemText
                            primary={territory.name}
                            secondary={`${totalLeads} leads • ${completedLeads} completed`}
                          />
                          <Chip
                            label={`${completionPercentage}%`}
                            color="primary"
                            size="small"
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <Typography color="text.secondary">No territories assigned yet</Typography>
                )}
              </Paper>
            </Grid>

            {/* Recent Leads for Quick Actions */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                {territories.length > 0 && territories[0].leads.length > 0 ? (
                  <List dense>
                    {territories[0].leads.slice(0, 5).map((lead: any) => (
                      <ListItem key={lead.id}>
                        <ListItemText
                          primary={`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed Lead'}
                          secondary={lead.streetAddress}
                        />
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => handleStartInteraction(lead.id, 'Contacted')}
                            disabled={interactionMutation.isLoading || lead.lastInteraction}
                            startIcon={<SafeIcon icon={FiCheck} />}
                          >
                            {lead.lastInteraction ? 'Done' : 'Contact'}
                          </Button>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">No leads available for interaction</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      );
    };

    export default RepDashboard;