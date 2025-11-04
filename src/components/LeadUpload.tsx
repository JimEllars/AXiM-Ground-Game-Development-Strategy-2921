import React, { useState } from 'react';
    import {
      Box,
      Button,
      Paper,
      Typography,
      LinearProgress,
      Alert,
      Table,
      TableBody,
      TableCell,
      TableContainer,
      TableHead,
      TableRow,
      Chip,
    } from '@mui/material';
    import { FiUpload, FiFile, FiCheck, FiAlertTriangle } from 'react-icons/fi';
    import SafeIcon from '@/common/SafeIcon';

    interface LeadUploadProps {
      onUploadComplete: (result: any) => void;
    }

    const LeadUpload: React.FC<LeadUploadProps> = ({ onUploadComplete }) => {
      const [file, setFile] = useState<File | null>(null);
      const [uploading, setUploading] = useState(false);
      const [error, setError] = useState<string>('');
      const [validationErrors, setValidationErrors] = useState<any[]>([]);

      const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
          if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
            setError('Please select a valid CSV file.');
            setFile(null);
            return;
          }
          setFile(selectedFile);
          setError('');
          setValidationErrors([]);
        }
      };

      const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError('');
        setValidationErrors([]);

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/leads/bulk-import', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          });

          const result = await response.json();

          if (!response.ok) {
            if (response.status === 400 && result.details) {
              setValidationErrors(result.details);
              setError(result.error || 'CSV validation failed');
            } else {
              setError(result.error || 'An unexpected error occurred during upload.');
            }
            onUploadComplete({ error: result.error });
          } else {
            onUploadComplete(result);
            setFile(null); // Clear file on success
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Upload failed due to a network or server error.';
          setError(errorMessage);
          onUploadComplete({ error: errorMessage });
        } finally {
          setUploading(false);
        }
      };

      const sampleData = [
        { column: 'first_name', description: 'First name', example: 'John', required: true },
        { column: 'last_name', description: 'Last name', example: 'Smith', required: true },
        { column: 'street_address', description: 'Street address', example: '123 Main St', required: true },
        { column: 'city', description: 'City', example: 'San Francisco', required: true },
        { column: 'state', description: 'State', example: 'CA', required: true },
        { column: 'zip', description: 'ZIP code (5-digit)', example: '94105', required: true },
        { column: 'phone', description: 'Phone number', example: '555-123-4567', required: false },
        { column: 'email', description: 'Email address', example: 'john@example.com', required: false },
        { column: 'status', description: 'Lead status (optional, defaults to "New")', example: 'New', required: false },
        { column: 'notes', description: 'Additional notes', example: 'Potential customer', required: false },
      ];

      return (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Upload Leads
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload a CSV file with your leads. The system will automatically geocode addresses to place them on the map.
            </Typography>

            {/* File Upload Area */}
            <Box
              sx={{
                border: 2,
                borderColor: file ? 'success.main' : 'grey.300',
                borderStyle: 'dashed',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                mb: 3,
                bgcolor: file ? 'success.light' : 'grey.50',
              }}
            >
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="csv-file-input"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="csv-file-input">
                <SafeIcon
                  icon={file ? FiCheck : FiFile}
                  style={{ fontSize: 48, color: file ? '#4caf50' : '#666', marginBottom: 16 }}
                />
                <Typography variant="h6" gutterBottom>
                  {file ? file.name : 'Select CSV File'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {file ? `File size: ${(file.size / 1024).toFixed(1)} KB` : 'Choose a CSV file to upload'}
                </Typography>
                <Button variant="contained" component="span" startIcon={<SafeIcon icon={FiUpload} />}>
                  {file ? 'Change File' : 'Select File'}
                </Button>
              </label>
            </Box>

            {/* Upload Button */}
            {file && (
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleUpload}
                  disabled={uploading}
                  startIcon={<SafeIcon icon={FiUpload} />}
                >
                  {uploading ? 'Uploading...' : 'Upload Leads'}
                </Button>
              </Box>
            )}

            {/* Progress */}
            {uploading && (
              <Box sx={{ mb: 3 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Processing and geocoding leads...
                </Typography>
              </Box>
            )}

            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography fontWeight="bold">{error}</Typography>
                {validationErrors.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2"><strong>Validation Details:</strong></Typography>
                    <ul>
                      {validationErrors.slice(0, 5).map((err, index) => (
                        <li key={index}>
                          <Typography variant="caption">
                            Row {err.row}: {Object.values(err.errors.fieldErrors).flat().join(', ')}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                    {validationErrors.length > 5 && (
                      <Typography variant="caption">...and {validationErrors.length - 5} more errors.</Typography>
                    )}
                  </Box>
                )}
              </Alert>
            )}
          </Paper>

          {/* CSV Format Guide */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              CSV Format Guide
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your CSV file must include the following columns. Column names should be in the first row.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Column Name</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Example</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sampleData.map((row) => (
                    <TableRow key={row.column}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <code>{row.column}</code>
                          {row.required && (
                            <Chip label="Required" size="small" color="primary" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell><code>{row.example}</code></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tips:</strong> <br />
                • Include column headers in the first row <br />
                • Ensure street addresses are complete for better geocoding results <br />
                • Maximum file size: 10MB <br />• The system will automatically detect and geocode addresses
              </Typography>
            </Alert>
          </Paper>
        </Box>
      );
    };

    export default LeadUpload;