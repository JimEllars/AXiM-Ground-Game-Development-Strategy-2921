import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Grid,
  Divider,
  Button,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FiMapPin, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import { leadsAPI } from '@/services/api';

// Handle potentially undefined import.meta.env in test environment
const getMapboxToken = () => {
  try {
    // In Vite, import.meta.env exists. In Jest (without custom config), it might throw or be undefined.
    // We check if import.meta is defined first.
    return (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';
  } catch {
    return '';
  }
};
const MAPBOX_TOKEN = getMapboxToken();

interface LeadDetailsProps {
  lead: any;
  onUpdate?: () => void;
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    status: lead.status || 'New',
    notes: lead.notes || '',
    phone: lead.phone || '',
    email: lead.email || '',
    streetAddress: lead.streetAddress || '',
    city: lead.city || '',
    state: lead.state || '',
    zip: lead.zip || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fix location parsing: backend returns { type: 'Point', coordinates: [lon, lat] }
  // or sometimes { x: ..., y: ... } depending on legacy code, but we know it's GeoJSON now.
  let longitude: number | null = null;
  let latitude: number | null = null;

  if (lead.location) {
    if (lead.location.type === 'Point' && Array.isArray(lead.location.coordinates)) {
      longitude = lead.location.coordinates[0];
      latitude = lead.location.coordinates[1];
    } else if (typeof lead.location.x === 'number' && typeof lead.location.y === 'number') {
      longitude = lead.location.x;
      latitude = lead.location.y;
    }
  }
  const hasLocation = longitude !== null && latitude !== null && !isNaN(longitude) && !isNaN(latitude);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      await leadsAPI.update(lead.id, formData);
      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      status: lead.status || 'New',
      notes: lead.notes || '',
      phone: lead.phone || '',
      email: lead.email || '',
      streetAddress: lead.streetAddress || '',
      city: lead.city || '',
      state: lead.state || '',
      zip: lead.zip || '',
    });
    setIsEditing(false);
    setError('');
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {isEditing ? 'Edit Lead' : `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed Lead'}
            </Typography>
            {!isEditing ? (
              <Button
                startIcon={<SafeIcon icon={FiEdit2} />}
                size="small"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            ) : (
              <Box>
                <Button
                  startIcon={<SafeIcon icon={FiX} />}
                  size="small"
                  onClick={handleCancel}
                  disabled={loading}
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SafeIcon icon={FiSave} />}
                  size="small"
                  onClick={handleSave}
                  disabled={loading}
                >
                  Save
                </Button>
              </Box>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Divider sx={{ mb: 2 }} />

          {isEditing ? (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  size="small"
                >
                   {['New', 'Contacted', 'Hot Lead', 'Not Interested', 'Completed'].map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
            </Grid>
          ) : (
            <>
              <Typography variant="body1" sx={{ mt: 1 }}>
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
              <Typography variant="body1" gutterBottom>
                  <strong>Status:</strong> <Chip label={lead.status} size="small" />
              </Typography>
              {lead.notes && (
                  <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <strong>Notes:</strong> {lead.notes}
                  </Typography>
              )}
            </>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        {hasLocation ? (
          <Box sx={{ height: 300, borderRadius: 1, overflow: 'hidden' }}>
            <Map
              initialViewState={{
                longitude: longitude,
                latitude: latitude,
                zoom: 14,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/streets-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
            >
              <Marker longitude={longitude} latitude={latitude}>
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
