import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import { FiSave, FiX } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import { appointmentsAPI, usersAPI } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from 'react-query';

interface AppointmentFormProps {
  leadId: string;
  onSubmit: (appointment: any) => void;
  onCancel: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ leadId, onSubmit, onCancel }) => {
  const queryClient = useQueryClient();
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');

  const { data: usersData, isLoading: loadingUsers } = useQuery(
    'users',
    () => usersAPI.getUsers().then((res) => res.data.users)
  );

  const createMutation = useMutation(
    (data: { leadId: string; userId: string; scheduledAt: string; notes?: string }) =>
      appointmentsAPI.create(data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('appointments');
        onSubmit(data.data.appointment);
      },
      onError: (err: any) => {
        setError(err.response?.data?.error || 'Failed to schedule appointment');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt || !userId) {
      setError('Please fill in all required fields');
      return;
    }

    // Ensure date is in future
    if (new Date(scheduledAt) < new Date()) {
      setError('Appointment must be scheduled in the future');
      return;
    }

    createMutation.mutate({
      leadId,
      userId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: 'grey.200', borderRadius: 2, mb: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
      <Typography variant="h6" gutterBottom>
        Schedule Appointment
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Assign To</InputLabel>
          <Select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            label="Assign To"
            required
            disabled={loadingUsers}
          >
            {usersData?.map((user: any) => (
              <MenuItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.role})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Date & Time"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          sx={{ mb: 2 }}
          required
          InputLabelProps={{
            shrink: true,
          }}
        />

        <TextField
          fullWidth
          label="Notes (Optional)"
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isLoading}
            startIcon={<SafeIcon icon={FiSave} />}
            sx={{ py: 1.5, flex: 1, fontSize: '1rem' }}
          >
            {createMutation.isLoading ? 'Saving...' : 'Schedule'}
          </Button>
          <Button
            variant="outlined"
            onClick={onCancel}
            startIcon={<SafeIcon icon={FiX} />}
            sx={{ py: 1.5, flex: 1, fontSize: '1rem' }}
          >
            Cancel
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default AppointmentForm;
