import React, { useState } from 'react';
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
      CircularProgress,
      Collapse,
    } from '@mui/material';
    import { FiMapPin, FiPlus } from 'react-icons/fi';
import { useQuery, useQueryClient } from 'react-query';
    import SafeIcon from '@/common/SafeIcon';
    import LeadInteractionForm from '@/components/LeadInteractionForm';
    import TerritoryStats from '@/components/TerritoryStats';
    import RepTerritoryMap from '@/components/RepTerritoryMap';
    import { repsAPI } from '@/services/api';

    const RepTurf: React.FC = () => {
      const queryClient = useQueryClient();
      const [selectedLead, setSelectedLead] = useState<any>(null);
      const [showInteractionForm, setShowInteractionForm] = useState(false);

      const { data: territoriesData, isLoading: loading, error: queryError } = useQuery(
        'repTurf',
        () => repsAPI.getMyTurf().then(res => res.data.territories)
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
            My Turf
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Manage your assigned territories and track lead interactions.
          </Typography>
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
              {territories.map((territory) => (
                <Box key={territory.id} sx={{ mb: 3 }}>
                  <TerritoryStats territory={territory} />
                  <Paper sx={{ p: 3, mb: 2 }}>
                    <RepTerritoryMap boundary={territory.boundary} leads={territory.leads} />
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