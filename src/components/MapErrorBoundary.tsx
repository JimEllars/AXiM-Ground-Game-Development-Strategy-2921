import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemText, ListItemIcon, Chip } from '@mui/material';
import { FiAlertTriangle, FiRefreshCw, FiMapPin } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import logger from '@/utils/logger';
import { analyticsAPI } from '@/services/api';

interface MapErrorBoundaryProps {
  children: ReactNode;
  fallbackLeads?: any[];
  onLeadClick?: (lead: any) => void;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  public state: MapErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorData = { message: error.message, stack: error.stack, componentStack: errorInfo.componentStack };
    logger.error('Map component crashed', errorData);
    // Sync telemetry to backend
    // Include active user info locally, though backend extracts from token
    const userJson = localStorage.getItem('user');
    let userId;
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        userId = user.id;
      } catch(e) {}
    }

    analyticsAPI.reportClientError({
      type: 'map_crash',
      userId,

      ...errorData
    }).catch(err => {
      console.error('Failed to report telemetry', err);
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      const { fallbackLeads, onLeadClick } = this.props;

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 300, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'warning.main' }}>
            <SafeIcon icon={FiAlertTriangle} style={{ marginRight: 8, fontSize: 24 }} />
            <Typography variant="h6" color="warning.main">
              Map Unavailable (Graceful Degradation)
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The interactive map could not be loaded. You can still access your leads below.
          </Typography>

          <Button variant="outlined" onClick={this.handleReset} startIcon={<FiRefreshCw />} sx={{ alignSelf: 'flex-start', mb: 2 }}>
            Retry Map
          </Button>

          {fallbackLeads && fallbackLeads.length > 0 ? (
            <Paper sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 400 }}>
              <List>
                {fallbackLeads.map((lead) => (
                  <ListItem key={lead.id} button onClick={() => onLeadClick && onLeadClick(lead)} divider>
                    <ListItemIcon>
                      <SafeIcon icon={FiMapPin} style={{ color: lead.status === 'Completed' ? 'green' : 'inherit' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={lead.firstName || lead.lastName ? `${lead.firstName || ''} ${lead.lastName || ''}` : 'Unnamed Lead'}
                      secondary={lead.streetAddress ? <a href={`https://maps.google.com/?q=${encodeURIComponent([lead.streetAddress, lead.city, lead.state, lead.zip].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1E3A8A', textDecoration: 'none', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>{lead.streetAddress}</a> : 'No address'}
                    />
                    <Chip label={lead.status || 'New'} size="small" />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
              <Typography color="text.secondary">No leads available in this territory.</Typography>
            </Paper>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
