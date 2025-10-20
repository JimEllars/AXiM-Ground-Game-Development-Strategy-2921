import React, { useState } from 'react';
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
    } from '@mui/material';
    import { FiSave, FiDownload, FiUpload } from 'react-icons/fi';
    import SafeIcon from '@/common/SafeIcon';

    const SettingsPage: React.FC = () => {
      const [settings, setSettings] = useState({
        organizationName: 'Demo Organization',
        defaultInteractionGoal: 50,
        enableNotifications: true,
        enableLocationTracking: true,
        autoAssignLeads: false,
        dataRetentionDays: 365,
      });
      const [loading, setLoading] = useState(false);
      const [success, setSuccess] = useState('');
      const [error, setError] = useState('');

      const handleSaveSettings = async () => {
        try {
          setLoading(true);
          setError('');
          setSuccess('');
          // Mock save - in real implementation, this would call an API
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setSuccess('Settings saved successfully');
          setTimeout(() => setSuccess(''), 3000);
        } catch (error: any) {
          setError(error.response?.data?.error || 'Failed to save settings');
        } finally {
          setLoading(false);
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