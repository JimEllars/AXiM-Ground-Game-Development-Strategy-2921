import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { FiSave, FiDownload, FiUpload, FiPlus, FiTrash2 } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import { settingsAPI, leadsAPI } from '@/services/api';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    organizationName: 'Demo Organization',
    defaultInteractionGoal: 50,
    enableNotifications: true,
    enableLocationTracking: true,
    autoAssignLeads: false,
    dataRetentionDays: 365,
  });

  // Survey Builder State
  const [surveys, setSurveys] = useState<any[]>([]);
  const [newSurveyQuestions, setNewSurveyQuestions] = useState<any[]>([
    { id: Date.now(), text: '', type: 'text', options: [] }
  ]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const response = await settingsAPI.getSurveys();
      setSurveys(response.data);
    } catch (err: any) {
      console.error('Error fetching surveys:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCampaignData = async () => {
    try {
      const response = await leadsAPI.export();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'axim_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to export campaign data');
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `settings-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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
          setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
          setError('Failed to import settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAddQuestion = () => {
    setNewSurveyQuestions([...newSurveyQuestions, { id: Date.now(), text: '', type: 'text', options: [] }]);
  };

  const handleQuestionChange = (id: number, field: string, value: any) => {
    setNewSurveyQuestions(newSurveyQuestions.map(q =>
      q.id === id ? { ...q, [field]: value, options: field === 'type' && value !== 'multiple_choice' ? [] : q.options } : q
    ));
  };

  const handleAddOption = (questionId: number) => {
    setNewSurveyQuestions(newSurveyQuestions.map(q =>
      q.id === questionId ? { ...q, options: [...q.options, ''] } : q
    ));
  };

  const handleOptionChange = (questionId: number, optionIndex: number, value: string) => {
    setNewSurveyQuestions(newSurveyQuestions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleRemoveOption = (questionId: number, optionIndex: number) => {
    setNewSurveyQuestions(newSurveyQuestions.map(q => {
      if (q.id === questionId) {
        const newOptions = q.options.filter((_: any, idx: number) => idx !== optionIndex);
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleRemoveQuestion = (id: number) => {
    setNewSurveyQuestions(newSurveyQuestions.filter(q => q.id !== id));
  };

  const handleSaveSurvey = async () => {
    try {
      setLoading(true);
      setError('');
      // Clean up internal id field
      const questionsToSave = newSurveyQuestions.map(({ id, ...rest }) => rest);
      await settingsAPI.createSurvey(questionsToSave);
      setSuccess('Survey created successfully');
      setNewSurveyQuestions([{ id: Date.now(), text: '', type: 'text', options: [] }]);
      await fetchSurveys();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save survey');
    } finally {
      setLoading(false);
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

        {/* Data Management */}
        <Grid item xs={12}>
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
    </Box>
  );
};

export default SettingsPage;
