import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Grid,
  Divider,
} from '@mui/material';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FiMapPin } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface LeadDetailsProps {
  lead: any;
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead }) => {
  const hasLocation = lead.location && lead.location.x && lead.location.y;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed Lead'}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body1">
            <strong>Address:</strong> {lead.streetAddress}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1">
            <strong>Contact:</strong> {lead.phone || 'N/A'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lead.email || 'No email'}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Chip label={`Status: ${lead.status}`} size="small" />
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        {hasLocation ? (
          <Box sx={{ height: 300, borderRadius: 1, overflow: 'hidden' }}>
            <Map
              initialViewState={{
                longitude: lead.location.x,
                latitude: lead.location.y,
                zoom: 14,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/streets-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
            >
              <Marker longitude={lead.location.x} latitude={lead.location.y}>
                <SafeIcon icon={FiMapPin} style={{ fontSize: 24, color: '#f57c00' }} />
              </Marker>
            </Map>
          </Box>
        ) : (
          <Box
            sx={{
              height: 300,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'grey.200',
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary">No location data available</Typography>
          </Box>
        )}
      </Grid>
    </Grid>
  );
};

export default LeadDetails;
