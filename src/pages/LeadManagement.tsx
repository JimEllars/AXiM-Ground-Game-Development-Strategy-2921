import React, { useState, useEffect } from 'react';
    import {
      Box,
      Typography,
      Tabs,
      Tab,
      Paper,
      Table,
      TableBody,
      TableCell,
      TableContainer,
      TableHead,
      TableRow,
      Chip,
      TextField,
      InputAdornment,
      Pagination,
      Alert,
      CircularProgress,
    } from '@mui/material';
    import { FiSearch } from 'react-icons/fi';
    import SafeIcon from '@/common/SafeIcon';
    import LeadUpload from '@/components/LeadUpload';
    import { leadsAPI } from '@/services/api';

    interface TabPanelProps {
      children?: React.ReactNode;
      index: number;
      value: number;
    }

    function TabPanel({ children, value, index }: TabPanelProps) {
      return (
        <div hidden={value !== index}>
          {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
      );
    }

    const LeadManagement: React.FC = () => {
      const [tabValue, setTabValue] = useState(0);
      const [leads, setLeads] = useState<any[]>([]);
      const [loading, setLoading] = useState(false);
      const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
      const [searchTerm, setSearchTerm] = useState('');
      const [statusFilter, setStatusFilter] = useState('');
      const [success, setSuccess] = useState('');
      const [error, setError] = useState('');

      useEffect(() => {
        if (tabValue === 1) {
          loadLeads();
        }
      }, [tabValue, pagination.page, searchTerm, statusFilter]);

      const loadLeads = async () => {
        try {
          setLoading(true);
          const params = {
            page: pagination.page,
            limit: pagination.limit,
            ...(searchTerm && { search: searchTerm }),
            ...(statusFilter && { status: statusFilter }),
          };
          const response = await leadsAPI.getAll(params);
          setLeads(response.data.leads);
          setPagination(response.data.pagination);
        } catch (err: any) {
          setError(err.response?.data?.error || 'Failed to load leads');
        } finally {
          setLoading(false);
        }
      };

      const handleUploadComplete = (result: any) => {
        setSuccess(
          `Successfully uploaded ${result.totalLeads} leads with ${result.geocodingRate} geocoding success rate`
        );
        setError('');
        // Switch to leads tab and reload
        setTabValue(1);
        loadLeads();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      };

      const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
      };

      const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPagination((prev) => ({ ...prev, page: value }));
      };

      const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
          case 'new':
            return 'default';
          case 'contacted':
            return 'info';
          case 'hot lead':
            return 'warning';
          case 'not interested':
            return 'error';
          case 'completed':
            return 'success';
          default:
            return 'default';
        }
      };

      return (
        <Box>
          <Typography variant="h4" gutterBottom>
            Lead Management
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Upload and manage your canvassing leads. Import CSV files and track lead status and interactions.
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
          <Paper sx={{ width: '100%' }}>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Upload Leads" />
              <Tab label={`View Leads (${pagination.total})`} />
            </Tabs>
            <TabPanel value={tabValue} index={0}>
              <LeadUpload onUploadComplete={handleUploadComplete} />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 3 }}>
                {/* Filters */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <TextField
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SafeIcon icon={FiSearch} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 300 }}
                  />
                  <TextField
                    select
                    label="Status Filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    SelectProps={{ native: true }}
                    sx={{ minWidth: 150 }}
                  >
                    <option value="">All Status</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Hot Lead">Hot Lead</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Completed">Completed</option>
                  </TextField>
                </Box>

                {/* Leads Table */}
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                            <CircularProgress />
                          </TableCell>
                        </TableRow>
                      ) : leads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                            No leads found
                          </TableCell>
                        </TableRow>
                      ) : (
                        leads.map((lead) => (
                          <TableRow key={lead.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{lead.streetAddress}</Typography>
                              {(lead.city || lead.state || lead.zip) && (
                                <Typography variant="caption" color="text.secondary">
                                  {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {lead.phone && <Typography variant="body2">{lead.phone}</Typography>}
                              {lead.email && (
                                <Typography variant="caption" color="text.secondary">
                                  {lead.email}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={lead.status}
                                size="small"
                                color={getStatusColor(lead.status) as any}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={lead.location ? 'Geocoded' : 'No Location'}
                                size="small"
                                variant="outlined"
                                color={lead.location ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {new Date(lead.createdAt).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={pagination.pages}
                      page={pagination.page}
                      onChange={handlePageChange}
                      color="primary"
                    />
                  </Box>
                )}
              </Box>
            </TabPanel>
          </Paper>
        </Box>
      );
    };

    export default LeadManagement;