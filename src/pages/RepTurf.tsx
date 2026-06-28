import { useState } from 'react';
    import {
      Box,
      Typography,
      Paper,
      List,
      ListItem,
      ListItemText,
      ListItemIcon,
      Chip,
      Button,
      Alert,
      Collapse,
      LinearProgress
    } from '@mui/material';
    import { FiMapPin, FiPlus, FiTarget } from 'react-icons/fi';
import { useQuery, useQueryClient } from 'react-query';
    import SafeIcon from '@/common/SafeIcon';
    import LeadInteractionForm from '@/components/LeadInteractionForm';
    import TerritoryStats from '@/components/TerritoryStats';
    import RepTerritoryMap from '@/components/RepTerritoryMap';
import ErrorBoundary from '@/components/ErrorBoundary';
    import { repsAPI } from '@/services/api';
import SkeletonLoader from '@/components/SkeletonLoader';

    const RepTurf: React.FC = () => {
      const queryClient = useQueryClient();
      const [selectedLead, setSelectedLead] = useState<any>(null);
      const [showInteractionForm, setShowInteractionForm] = useState(false);

      const { data: territoriesData, isLoading: loading, error: queryError } = useQuery(
        'repTurf',
        () => repsAPI.getMyTurf().then(res => res.data.territories)
      );

      const { data: repStatsData } = useQuery(
        'repStats',
        () => {
           const today = new Date().toISOString().split('T')[0];
           return repsAPI.getStats({ startDate: today, endDate: today }).then(res => res.data);
        }
      );

      const territories = territoriesData || [];
      const errorMsg = queryError ? (queryError as any).response?.data?.error || 'Failed to load turf data' : '';

      const handleInteractionSubmit = () => {
        setShowInteractionForm(false);
        setSelectedLead(null);
        // Refresh data
        queryClient.invalidateQueries('repTurf');
        queryClient.invalidateQueries('repStats');
      };

      const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
          case 'completed':
            return 'success';
          case 'contacted':
            return 'info';
          case 'hot lead':
            return 'warning';
          case 'not interested':
            return 'error';
          default:
            return 'default';
        }
      };

      // Calculate totals for daily performance metric
      const totalAssignedLeads = territories.reduce((acc: number, t: any) => acc + (t.leads?.length || 0), 0);
      const todayInteractions = repStatsData?.summary?.totalInteractions || 0;
      const todayCompletionRate = totalAssignedLeads > 0 ? Math.min(Math.round((todayInteractions / totalAssignedLeads) * 100), 100) : 0;

      if (loading) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Turf
      </Typography>
      <SkeletonLoader type="dashboard" />
    </Box>
  );
}

      return (
        <Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                My Turf
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your assigned territories and track lead interactions.
              </Typography>
            </Box>

            {/* Read-Only Rep Analytics View */}
            <Paper sx={{ p: 2, mt: { xs: 2, md: 0 }, minWidth: '250px', bgcolor: 'primary.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                <SafeIcon icon={FiTarget} style={{ color: '#1E3A8A' }} />
                <Typography variant="subtitle2" fontWeight="bold" color="primary.main">Today's Progress</Typography>
              </Box>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {todayInteractions} / {totalAssignedLeads} <Typography component="span" variant="body2" color="text.secondary">leads</Typography>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress variant="determinate" value={todayCompletionRate} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Typography variant="body2" fontWeight="bold">{todayCompletionRate}%</Typography>
              </Box>
            </Paper>
          </Box>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {territories.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No territories assigned
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contact your manager to get territories assigned to you.
              </Typography>
            </Paper>
          ) : (
            <Box>
              {territories.map((territory: any) => (
                <Box key={territory.id} sx={{ mb: 3 }}>
                  <TerritoryStats territory={territory} />
                  <Paper sx={{ p: 3, mb: 2 }}>
                    <ErrorBoundary><RepTerritoryMap boundary={territory.boundary} leads={territory.leads} /></ErrorBoundary>
                  </Paper>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Leads in {territory.name}
                    </Typography>
                    {territory.leads?.length === 0 ? (
                      <Typography color="text.secondary">No leads in this territory yet.</Typography>
                    ) : (
                      <List>
                        {territory.leads.map((lead: any) => (
                          <ListItem key={lead.id} divider>
                            <ListItemIcon>
                              <SafeIcon icon={FiMapPin} />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight="medium">
                                    {`${lead.firstName || ''} ${lead.lastName || ''}`.trim() ||
                                      'Unnamed Lead'}
                                  </Typography>
                                  <Chip
                                    label={lead.status || 'New'}
                                    size="small"
                                    color={getStatusColor(lead.status) as any}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {lead.streetAddress}
                                    {(lead.city || lead.state || lead.zip) && (
                                      <>, {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}</>
                                    )}
                                  </Typography>
                                  {lead.lastInteraction && (
                                    <Typography variant="caption" color="text.secondary">
                                      Last interaction:{' '}
                                      {new Date(lead.lastInteraction.date).toLocaleDateString()} -{' '}
                                      {lead.lastInteraction.outcome}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowInteractionForm(true);
                              }}
                              startIcon={<SafeIcon icon={FiPlus} />}
                              disabled={!!lead.lastInteraction}
                              sx={{ minWidth: 44, minHeight: 44 }}
                            >
                              {lead.lastInteraction ? 'Completed' : 'Add Interaction'}
                            </Button>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Paper>
                </Box>
              ))}

              {/* Interaction Form */}
              <Collapse in={showInteractionForm}>
                {selectedLead && (
                  <LeadInteractionForm
                    lead={selectedLead}
                    onSubmit={handleInteractionSubmit}
                    onCancel={() => {
                      setShowInteractionForm(false);
                      setSelectedLead(null);
                    }}
                  />
                )}
              </Collapse>
            </Box>
          )}
        </Box>
      );
    };

    export default RepTurf;
