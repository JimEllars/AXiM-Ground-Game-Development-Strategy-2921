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
  Chip
} from '@mui/material';
import { FiUpload, FiFile, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

interface LeadUploadProps {
  onUploadComplete: (result: any) => void;
}

const LeadUpload: React.FC<LeadUploadProps> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadResult(result);
      onUploadComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const sampleData = [
    { column: 'street_address', description: 'Street address (required)', example: '123 Main St' },
    { column: 'first_name', description: 'First name (optional)', example: 'John' },
    { column: 'last_name', description: 'Last name (optional)', example: 'Smith' },
    { column: 'city', description: 'City (optional)', example: 'San Francisco' },
    { column: 'state', description: 'State (optional)', example: 'CA' },
    { column: 'zip', description: 'ZIP code (optional)', example: '94105' },
    { column: 'phone', description: 'Phone number (optional)', example: '(555) 123-4567' },
    { column: 'email', description: 'Email address (optional)', example: 'john@example.com' },
    { column: 'status', description: 'Lead status (optional)', example: 'New' },
    { column: 'notes', description: 'Additional notes (optional)', example: 'Potential customer' }
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
        <Box sx={{ 
          border: 2, 
          borderColor: file ? 'success.main' : 'grey.300',
          borderStyle: 'dashed',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          mb: 3,
          bgcolor: file ? 'success.light' : 'grey.50'
        }}>
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
            <Button
              variant="contained"
              component="span"
              startIcon={<SafeIcon icon={FiUpload} />}
            >
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

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} icon={<SafeIcon icon={FiAlertTriangle} />}>
            {error}
          </Alert>
        )}

        {/* Success Result */}
        {uploadResult && (
          <Alert severity="success" sx={{ mb: 3 }} icon={<SafeIcon icon={FiCheck} />}>
            <Typography variant="subtitle2" gutterBottom>
              Upload Successful!
            </Typography>
            <Typography variant="body2">
              • Total leads uploaded: {uploadResult.totalLeads}
            </Typography>
            <Typography variant="body2">
              • Successfully geocoded: {uploadResult.geocodedLeads}
            </Typography>
            <Typography variant="body2">
              • Geocoding success rate: {uploadResult.geocodingRate}
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* CSV Format Guide */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          CSV Format Guide
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your CSV file should include the following columns. Only <strong>street_address</strong> is required.
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
                      {row.column === 'street_address' && (
                        <Chip label="Required" size="small" color="primary" />
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
            <strong>Tips:</strong>
            <br />• Include column headers in the first row
            <br />• Ensure street addresses are complete for better geocoding results
            <br />• Maximum file size: 10MB
            <br />• The system will automatically detect and geocode addresses
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};

export default LeadUpload;