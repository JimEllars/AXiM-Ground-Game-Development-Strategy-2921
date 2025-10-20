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
  Chip,
  Alert
} from '@mui/material';
import { FiSave, FiX } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { interactionsAPI } from '../services/api';

interface LeadInteractionFormProps {
  lead: any;
  onSubmit: (interaction: any) => void;
  onCancel: () => void;
}

const outcomes = [
  'Contacted',
  'Interested',
  'Follow-up Required',
  'Not Interested',
  'Not Home',
  'Completed',
  'Sold'
];

const LeadInteractionForm: React.FC<LeadInteractionFormProps> = ({
  lead,
  onSubmit,
  onCancel
}) => {
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) {
      setError('Please select an outcome');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const interaction = {
        leadId: lead.id,
        outcome,
        notes: notes.trim() || undefined,
        interactionDate: new Date()
      };

      await interactionsAPI.create([interaction]);
      onSubmit(interaction);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save interaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Record Interaction
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Lead: {`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed'} - {lead.streetAddress}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Outcome</InputLabel>
          <Select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            label="Outcome"
            required
          >
            {outcomes.map((outcomeOption) => (
              <MenuItem key={outcomeOption} value={outcomeOption}>
                {outcomeOption}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Notes (Optional)"
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={<SafeIcon icon={FiSave} />}
          >
            {submitting ? 'Saving...' : 'Save Interaction'}
          </Button>
          <Button
            variant="outlined"
            onClick={onCancel}
            startIcon={<SafeIcon icon={FiX} />}
          >
            Cancel
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default LeadInteractionForm;