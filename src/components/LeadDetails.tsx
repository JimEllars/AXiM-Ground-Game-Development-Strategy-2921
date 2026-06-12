import { useState } from 'react';
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
import { FiMapPin, FiEdit2, FiSave, FiX, FiCalendar } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import { leadsAPI } from '@/services/api';
import AppointmentForm from './AppointmentForm';
import { useQueryClient, useQuery } from 'react-query';
import { Collapse } from '@mui/material';
import { parseLeadLocation } from '@/common/locationUtils';

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
  const queryClient = useQueryClient();
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);

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

  const { data: insightsData, isLoading: insightsLoading } = useQuery(
    ['leadInsights', lead.id],
    () => leadsAPI.getInsights(lead.id).then(res => res.data.insights),
    {
      enabled: !!lead.id,
      retry: 1,
    }
  );


  // Backend returns { type: 'Point', coordinates: [lon, lat] } or sometimes
  // { x: ..., y: ... } depending on legacy code, but we know it's GeoJSON now.
  // We use the centralized parseLeadLocation utility to handle both robustly.
  const parsedLocation = parseLeadLocation(lead?.location);
  const longitude = parsedLocation?.longitude ?? undefined;
  const latitude = parsedLocation?.latitude ?? undefined;
  const hasLocation = !!parsedLocation;

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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SafeIcon icon={FiCalendar} />}
          onClick={() => setShowAppointmentForm(!showAppointmentForm)}
        >
          {showAppointmentForm ? 'Cancel Scheduling' : 'Schedule Appointment'}
        </Button>
      </Box>

      <Collapse in={showAppointmentForm}>
        <AppointmentForm
          leadId={lead.id}
          onSubmit={() => {
            setShowAppointmentForm(false);
            queryClient.invalidateQueries('appointments');
          }}
          onCancel={() => setShowAppointmentForm(false)}
        />
      </Collapse>

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

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                AXiM Insights
              </Typography>
              {insightsLoading ? (
                <Typography variant="body2" color="text.secondary">Loading insights...</Typography>
              ) : insightsData ? (
                <Box sx={{ p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Predicted Income:</strong> {insightsData.predictedIncome}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Voting Likelihood:</strong> {insightsData.votingLikelihood}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Demographics:</strong> {insightsData.demographicSegment}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No insights available.</Typography>
              )}

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
              {longitude !== undefined && latitude !== undefined && <Marker longitude={longitude} latitude={latitude}>
                <SafeIcon icon={FiMapPin} style={{ fontSize: 24, color: '#f57c00' }} />
              </Marker>}
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
    </Box>
  );
};

export default LeadDetails;
