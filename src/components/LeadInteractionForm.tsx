import { useState } from 'react';
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
    import { interactionsAPI, settingsAPI } from '@/services/api';
    import { db } from '@/db';
    import { useQuery } from 'react-query';

    interface LeadInteractionFormProps {
      lead: any;
      onSubmit: (interaction: any) => void;
      onCancel: () => void;
    }

    const fallbackOutcomes = [
      'Contacted',
      'Interested',
      'Follow-up Required',
      'Not Interested',
      'Not Home',
      'Completed',
      'Sold',
    ];

    const LeadInteractionForm: React.FC<LeadInteractionFormProps> = ({ lead, onSubmit, onCancel }) => {
      const [outcome, setOutcome] = useState('');
      const [notes, setNotes] = useState('');
      const [surveyAnswers, setSurveyAnswers] = useState<Record<string, any>>({});
      const [submitting, setSubmitting] = useState(false);
      const [error, setError] = useState('');

      const { data: settingsData } = useQuery('settings', async () => {
        try {
          const res = await settingsAPI.getSettings();
          const { surveys, dispositions } = res.data;

          await db.settings.put({ id: 'surveys', data: surveys });
          await db.settings.put({ id: 'dispositions', data: dispositions });

          return { surveys, dispositions };
        } catch (err) {
          const localSurveys = await db.settings.get('surveys');
          const localDispositions = await db.settings.get('dispositions');
          return {
            surveys: localSurveys?.data || [],
            dispositions: localDispositions?.data || []
          };
        }
      });

      const outcomes = settingsData?.dispositions?.length > 0
        ? settingsData?.dispositions?.map((d: any) => d.name)
        : fallbackOutcomes;

      const surveys = settingsData?.surveys || [];
      const currentDisposition = settingsData?.dispositions?.find((d: any) => d.name === outcome);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!outcome) {
          setError('Please select an outcome');
          return;
        }

        setSubmitting(true);
        setError('');

        try {
          const interactionDate = new Date();
          const surveyData = Object.keys(surveyAnswers).length > 0 ? surveyAnswers : undefined;

          const interaction = {
            leadId: lead.id,
            outcome,
            notes: notes.trim() || undefined,
            interactionDate,
            surveyData,
          };

          if (!navigator.onLine) {
            await db.interactions.add({
              leadId: lead.id,
              outcome,
              notes: notes.trim() || '',
              interactionDate: interactionDate.toISOString(),
              synced: false,
              surveyData,
            });
            onSubmit({ ...interaction, offline: true });
          } else {
            await interactionsAPI.create([interaction]);
            onSubmit(interaction);
          }
        } catch (error: any) {
          setError(error.response?.data?.error || 'Failed to save interaction');
        } finally {
          setSubmitting(false);
        }
      };

      return (
        <Box sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: 'grey.200', borderRadius: 2, mb: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
          <Typography variant="h6" gutterBottom>
            Record Interaction
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Lead: {`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed'} - {lead.streetAddress}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Outcome</InputLabel>
              <Select value={outcome} onChange={(e) => setOutcome(e.target.value)} label="Outcome" required>
                {outcomes.map((outcomeOption: any) => (
                  <MenuItem key={outcomeOption} value={outcomeOption}>
                    {outcomeOption}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={`Notes ${currentDisposition?.require_notes ? '(Required)' : '(Optional)'}`}
              required={currentDisposition?.require_notes}
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 2 }}
            />
            {surveys.map((survey: any) => (
               <Box key={survey.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                 <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{survey.name}</Typography>
                 {survey.description && <Typography variant="body2" color="text.secondary" gutterBottom>{survey.description}</Typography>}
                 {survey.questions.map((q: any, idx: number) => (
                   <Box key={idx} sx={{ mb: 2, mt: 1 }}>
                     {q.type === 'text' && (
                       <TextField
                         fullWidth
                         label={q.text}
                         required={q.required}
                         value={surveyAnswers[q.id] || ''}
                         onChange={e => setSurveyAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                       />
                     )}

                     {q.type === 'boolean' && (
                       <FormControl fullWidth required={q.required}>
                         <InputLabel>{q.text}</InputLabel>
                         <Select
                           label={q.text}
                           value={surveyAnswers[q.id] !== undefined ? String(surveyAnswers[q.id]) : ''}
                           onChange={e => setSurveyAnswers(prev => ({ ...prev, [q.id]: e.target.value === 'true' }))}
                         >
                           <MenuItem value="true">Yes</MenuItem>
                           <MenuItem value="false">No</MenuItem>
                         </Select>
                       </FormControl>
                     )}

                     {q.type === 'multiple_choice' && (
                       <FormControl fullWidth required={q.required}>
                         <InputLabel>{q.text}</InputLabel>
                         <Select
                           label={q.text}
                           value={surveyAnswers[q.id] || ''}
                           onChange={e => setSurveyAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                         >
                           {q.options?.map((opt: string) => (
                             <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                           ))}
                         </Select>
                       </FormControl>
                     )}
                   </Box>
                 ))}
               </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, mt: 3 }}>
              <Button type="submit" variant="contained" disabled={submitting} startIcon={<SafeIcon icon={FiSave} />} sx={{ py: 1.5, flex: 1, fontSize: '1rem' }}>
                {submitting ? 'Saving...' : 'Save Interaction'}
              </Button>
              <Button variant="outlined" onClick={onCancel} startIcon={<SafeIcon icon={FiX} />} sx={{ py: 1.5, flex: 1, fontSize: '1rem' }}>
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      );
    };

    export default LeadInteractionForm;