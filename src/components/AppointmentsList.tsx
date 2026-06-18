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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SkeletonLoader from '@/components/SkeletonLoader';
import { FiCalendar,  FiTrash2, FiMapPin } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { appointmentsAPI } from '@/services/api';

const AppointmentsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: appointmentsData, isLoading, error } = useQuery(
    'appointments',
    () => appointmentsAPI.getAll().then((res) => res.data.appointments)
  );

  const deleteMutation = useMutation(
    (id: string) => appointmentsAPI.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('appointments');
        setDeleteId(null);
      },
    }
  );

  const appointments = appointmentsData || [];

  if (isLoading) {
    return (
      <SkeletonLoader type="dashboard" />
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load appointments</Alert>;
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Upcoming Appointments
        </Typography>

        {appointments.length === 0 ? (
          <Typography color="text.secondary">No upcoming appointments scheduled.</Typography>
        ) : (
          <List>
            {appointments.map((apt: any) => (
              <ListItem key={apt.id} divider>
                <ListItemIcon>
                  <SafeIcon icon={FiCalendar} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {new Date(apt.scheduledAt).toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                      <Chip label={apt.status} size="small" color="primary" />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.primary">
                        Lead: {apt.lead.firstName} {apt.lead.lastName}
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SafeIcon icon={FiMapPin} style={{ fontSize: '0.8rem' }} />
                        {apt.lead.streetAddress}, {apt.lead.city}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Assigned to: {apt.user.firstName} {apt.user.lastName}
                      </Typography>
                      {apt.notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Notes: {apt.notes}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Button
                  size="small"
                  color="error"
                  startIcon={<SafeIcon icon={FiTrash2} />}
                  onClick={() => setDeleteId(apt.id)}
                >
                  Cancel
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Cancel Appointment</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to cancel this appointment?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Back</Button>
          <Button
            color="error"
            onClick={() => {
              if (deleteId) deleteMutation.mutate(deleteId);
            }}
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? 'Canceling...' : 'Cancel Appointment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppointmentsList;
