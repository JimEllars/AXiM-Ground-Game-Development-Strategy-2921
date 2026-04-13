import React, { useState } from 'react';
import { leadsAPI } from '@/services/api';
import { useQuery } from 'react-query';
import {
  Box, Button, Paper, Typography, LinearProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { FiUpload, FiFile, FiCheck } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';

interface LeadUploadProps {
  onUploadComplete: (result: any) => void;
}

const LeadUpload: React.FC<LeadUploadProps> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);

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
      setUploadResult(null);
    }
  };

  const [jobId, setJobId] = useState<string | null>(null);

  const { data: jobStatus, error: jobError } = useQuery(
    ['importJobStatus', jobId],
    () => leadsAPI.getImportJobStatus(jobId!).then(res => res.data),
    {
      enabled: !!jobId && uploading,
      refetchInterval: 1000,
    }
  );

  React.useEffect(() => {
    if (jobStatus) {
      if (jobStatus.state === 'completed') {
        setUploading(false);
        setUploadResult(jobStatus.result);
        onUploadComplete(jobStatus.result);
        setFile(null);
        setJobId(null);
      } else if (jobStatus.state === 'failed') {
        setUploading(false);
        setError(jobStatus.failedReason || 'Job failed');
        onUploadComplete({ error: jobStatus.failedReason || 'Job failed' });
        setJobId(null);
      }
    }
  }, [jobStatus, onUploadComplete]);

  React.useEffect(() => {
    if (jobError) {
      console.error("Error polling job status", jobError);
    }
  }, [jobError]);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setValidationErrors([]);
    setUploadResult(null);
    setJobId(null);

    try {
      const response = await leadsAPI.upload(file);
      const result = response.data;

      if (result.jobId) {
          setJobId(result.jobId);
      } else {
        setUploadResult(result);
        onUploadComplete(result);
        setFile(null);
        setUploading(false);
      }
    } catch (err: any) {
      const result = err.response?.data || {};
      if (err.response?.status === 400 && result.details) {
        setValidationErrors(result.details);
        setError(result.error || 'CSV validation failed');
      } else {
        const errorMessage = result.error || err.message || 'Upload failed due to a network or server error.';
        setError(errorMessage);
        onUploadComplete({ error: errorMessage });
      }
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
            data-testid="csv-file-input"
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

        {file && (
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleUpload}
              disabled={uploading}
              startIcon={<SafeIcon icon={FiUpload} />}
              data-testid="upload-button"
            >
              {uploading ? 'Uploading...' : 'Upload Leads'}
            </Button>
          </Box>
        )}

        {uploading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Processing and geocoding leads...
            </Typography>
          </Box>
        )}

        {uploadResult && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography fontWeight="bold">{uploadResult.message}</Typography>
            <Typography variant="body2">Successfully imported: {uploadResult.totalLeads}</Typography>
            <Typography variant="body2">Duplicates found: {uploadResult.duplicates}</Typography>
            <Typography variant="body2">Geocoding rate: {uploadResult.geocodingRate}</Typography>
          </Alert>
        )}

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
