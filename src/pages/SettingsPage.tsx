import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { FiSave, FiDownload, FiUpload, FiPlus, FiTrash2, FiAlertOctagon } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import { settingsAPI, leadsAPI } from '@/services/api';
import { useQuery } from 'react-query';
import { db } from '@/db';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    organizationName: 'AXiM Ground Game',
    defaultInteractionGoal: 50,
    enableNotifications: true,
    enableLocationTracking: true,
    autoAssignLeads: false,
    dataRetentionDays: 90,
  });

  const { data: surveysData, refetch: refetchSurveys } = useQuery(
    'surveys',
    () => settingsAPI.getSurveys().then((res) => res.data.surveys)
  );

  const surveys = surveysData || [];

  const [newSurveyQuestions, setNewSurveyQuestions] = useState<any[]>([
    { id: 'q1', type: 'text', text: '', required: false, options: [] }
  ]);

  const [openWipeDialog, setOpenWipeDialog] = useState(false);
  const [wipeError, setWipeError] = useState('');

  const handleSaveSettings = async () => {
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'axim_settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCampaignData = async () => {
    try {
      const response = await leadsAPI.export();
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'campaign_data.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError('Failed to export campaign data');
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          setSettings({ ...settings, ...importedSettings });
          setSuccess('Settings imported successfully');
        } catch (err) {
          setError('Failed to parse settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAddQuestion = () => {
    setNewSurveyQuestions([
      ...newSurveyQuestions,
      { id: `q${Date.now()}`, type: 'text', text: '', required: false, options: [] }
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    setNewSurveyQuestions(newSurveyQuestions.filter(q => q.id !== id));
  };

  const handleQuestionChange = (id: string, field: string, value: any) => {
    setNewSurveyQuestions(newSurveyQuestions.map(q =>
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const handleAddOption = (questionId: string) => {
    setNewSurveyQuestions(newSurveyQuestions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    }));
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    setNewSurveyQuestions(newSurveyQuestions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions.splice(optionIndex, 1);
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
    setNewSurveyQuestions(newSurveyQuestions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSaveSurvey = async () => {
    setLoading(true);
    setSuccess('');
    setError('');

    // Basic validation
    if (newSurveyQuestions.some(q => !q.text.trim())) {
      setError('All questions must have text');
      setLoading(false);
      return;
    }

    try {
      await settingsAPI.createSurvey({
        name: `Survey ${new Date().toLocaleDateString()}`,
        schema: newSurveyQuestions
      });
      setSuccess('Survey saved successfully');
      setNewSurveyQuestions([{ id: 'q1', type: 'text', text: '', required: false, options: [] }]);
      refetchSurveys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save survey');
    } finally {
      setLoading(false);
    }
  };

  const executeWipe = async () => {
    setWipeError('');
    try {
      // 1. Assert syncEngine.isQueueEmpty() (Check local table directly)
      const offlineCount = await db.interactions.where('synced').equals(0 as any).count();
      if (offlineCount > 0) {
        setWipeError(`Cannot wipe storage: You have ${offlineCount} pending interactions. Please sync first.`);
        return;
      }

      // 2. Completely purge all local IndexedDB tables
      await db.interactions.clear();
      await db.territories.clear();
      await db.settings.clear();
      await db.telemetryQueue.clear();

      // 3. Drop local encryption seeds and flush session state
      localStorage.removeItem('axim_device_salt');
      localStorage.removeItem('token');

      // 4. Redirect instantly to dead state /login view
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setWipeError('Critical error during storage wipe sequence.');
      console.error(err);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure application settings and preferences.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      <Grid container spacing={3}>
        {/* Survey Builder */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Survey Builder
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Active Surveys</Typography>
              {surveys.length > 0 ? (
                <List sx={{ mb: 3 }}>
                  {surveys.map((survey: any, index: number) => (
                    <ListItem key={survey.id || index} divider>
                      <ListItemText
                        primary={`Survey ${index + 1} (${new Date(survey.created_at).toLocaleDateString()})`}
                        secondary={`${survey.schema.length} questions`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>No active surveys found.</Typography>
              )}

              <Typography variant="subtitle1" gutterBottom>Create New Survey</Typography>
              {newSurveyQuestions.map((q, _index) => (
                <Paper key={q.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Question Text"
                        value={q.text}
                        onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={q.type}
                          label="Type"
                          onChange={(e) => handleQuestionChange(q.id, 'type', e.target.value)}
                        >
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="boolean">Yes/No</MenuItem>
                          <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <IconButton color="error" onClick={() => handleRemoveQuestion(q.id)} disabled={newSurveyQuestions.length === 1}>
                        <SafeIcon icon={FiTrash2} />
                      </IconButton>
                    </Grid>
                  </Grid>

                  {q.type === 'multiple_choice' && (
                    <Box sx={{ mt: 2, pl: 2 }}>
                      <Typography variant="body2" gutterBottom>Options</Typography>
                      {q.options.map((opt: string, optIndex: number) => (
                        <Box key={optIndex} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                          <TextField
                            size="small"
                            value={opt}
                            onChange={(e) => handleOptionChange(q.id, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                          />
                          <IconButton size="small" color="error" onClick={() => handleRemoveOption(q.id, optIndex)}>
                            <SafeIcon icon={FiTrash2} />
                          </IconButton>
                        </Box>
                      ))}
                      <Button size="small" startIcon={<SafeIcon icon={FiPlus} />} onClick={() => handleAddOption(q.id)}>
                        Add Option
                      </Button>
                    </Box>
                  )}
                </Paper>
              ))}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button variant="outlined" startIcon={<SafeIcon icon={FiPlus} />} onClick={handleAddQuestion}>
                  Add Question
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SafeIcon icon={FiSave} />}
                  onClick={handleSaveSurvey}
                  disabled={loading}
                >
                  Save Survey
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Organization Settings */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Organization Settings
              </Typography>
              <TextField
                fullWidth
                label="Organization Name"
                value={settings.organizationName}
                onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Daily Interaction Goal"
                type="number"
                value={settings.defaultInteractionGoal}
                onChange={(e) =>
                  setSettings({ ...settings, defaultInteractionGoal: parseInt(e.target.value) })
                }
                helperText="Default daily goal for field reps"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Data Retention (Days)"
                type="number"
                value={settings.dataRetentionDays}
                onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
                helperText="How long to keep interaction data"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Feature Settings */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Feature Settings
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableNotifications}
                      onChange={(e) =>
                        setSettings({ ...settings, enableNotifications: e.target.checked })
                      }
                    />
                  }
                  label="Enable Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableLocationTracking}
                      onChange={(e) =>
                        setSettings({ ...settings, enableLocationTracking: e.target.checked })
                      }
                    />
                  }
                  label="Enable Location Tracking"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoAssignLeads}
                      onChange={(e) => setSettings({ ...settings, autoAssignLeads: e.target.checked })}
                    />
                  }
                  label="Auto-assign Leads to Territories"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Device Management */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ border: '1px solid #EF4444' }}>
            <CardContent>
              <Typography variant="h6" color="error" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SafeIcon icon={FiAlertOctagon} /> Device Management
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Instantly flash-wipe all local storage, encrypted keys, and session data from this device.
              </Typography>
              <Button
                variant="contained"
                color="error"
                startIcon={<SafeIcon icon={FiTrash2} />}
                onClick={() => setOpenWipeDialog(true)}
              >
                Wipe Local Node Secure Storage
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Management */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Management
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<SafeIcon icon={FiDownload} />}
                  onClick={handleExportData}
                >
                  Export Settings
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<SafeIcon icon={FiDownload} />}
                  onClick={handleExportCampaignData}
                >
                  Export Campaign Data
                </Button>
                <Button variant="outlined" component="label" startIcon={<SafeIcon icon={FiUpload} />}>
                  Import Settings
                  <input type="file" accept=".json" hidden onChange={handleImportData} />
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
            <Button
              variant="contained"
              onClick={handleSaveSettings}
              disabled={loading}
              startIcon={<SafeIcon icon={FiSave} />}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Wipe Confirmation Dialog */}
      <Dialog open={openWipeDialog} onClose={() => setOpenWipeDialog(false)}>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SafeIcon icon={FiAlertOctagon} /> Critical Warning
        </DialogTitle>
        <DialogContent>
          {wipeError && (
             <Alert severity="warning" sx={{ mb: 2 }}>{wipeError}</Alert>
          )}
          <DialogContentText>
            This action will permanently delete all offline databases, wipe encryption keys, and immediately terminate this session. Any unsynced data will be irreversibly lost. Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWipeDialog(false)}>Cancel</Button>
          <Button onClick={executeWipe} color="error" variant="contained">
            Confirm Flash Wipe
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;
