import { useState, useMemo } from 'react';
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
      TablePagination,
      Alert,
      Button,
      Dialog,
      DialogTitle,
      DialogContent,
      DialogActions,
  Checkbox,
  Toolbar,
  Tooltip,
  IconButton,
  TableSortLabel,
  Card,
  CardContent,
  CardHeader,
    } from '@mui/material';
import SkeletonLoader from '@/components/SkeletonLoader';
import { FiSearch, FiEye, FiTrash } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
    import SafeIcon from '@/common/SafeIcon';
    import LeadUpload from '@/components/LeadUpload';
    import LeadDetails from '@/components/LeadDetails';
    import { leadsAPI } from '@/services/api';
    import { Lead } from '@/types';
    import { parseLeadLocation } from '@/common/locationUtils';
    import { TabPanel } from '@/components/TabPanel';

    const LeadManagement: React.FC = () => {
      const queryClient = useQueryClient();
      const [tabValue, setTabValue] = useState(0);
      const [pagination, setPagination] = useState({ page: 1, limit: 25, rowsPerPage: 25 });
      const [searchTerm, setSearchTerm] = useState('');
      const [statusFilter, setStatusFilter] = useState('');
      const [success, setSuccess] = useState('');
      const [error, setError] = useState('');
      const [isDetailsOpen, setDetailsOpen] = useState(false);
      const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState('createdAt');
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

      const { data: leadsData, isLoading: loading, error: _queryError } = useQuery(
        ['leads', pagination.page, pagination.rowsPerPage, searchTerm, statusFilter, orderBy, order],
        () => leadsAPI.getAll({
          page: pagination.page,
          limit: pagination.rowsPerPage,
          search: searchTerm,
          status: statusFilter,
          sort: orderBy,
          order,
        }).then(res => res.data),
        {
          enabled: tabValue === 1,
          keepPreviousData: true,
          onSuccess: () => setSelected([]),
        }
      );

      const leads = leadsData?.leads || [];
      const total = leadsData?.pagination?.total || 0;

      const deleteMutation = useMutation(
        (ids: string[]) => leadsAPI.deleteMany(ids),
        {
          onSuccess: (_, ids) => {
            setSuccess(`${ids.length} leads deleted successfully`);
            setSelected([]);
            queryClient.invalidateQueries('leads');
            setError('');
          },
          onError: (err: any) => {
            setError(err.response?.data?.error || 'Failed to delete leads');
          },
          onSettled: () => {
            setDeleteDialogOpen(false);
          }
        }
      );

      const handleUploadComplete = (result: any) => {
        if (result.error) {
          setError(result.error);
          setSuccess('');
        } else {
          const msg = result.message || 'Import started successfully.';
          setSuccess(msg);
          setError('');
          setTabValue(1);
          queryClient.invalidateQueries('leads');
        }
      };

      const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
      };

      const handlePageChange = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage + 1 }));
      };

      const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setPagination(prev => ({ ...prev, rowsPerPage: parseInt((event.target as any).value, 10), page: 1 }));
      };

      const handleOpenDetails = (lead: Lead) => {
        setSelectedLead(lead);
        setDetailsOpen(true);
      };

      const handleCloseDetails = () => {
        setDetailsOpen(false);
        setSelectedLead(null);
      };

      const handleLeadUpdate = () => {
        queryClient.invalidateQueries('leads');
        setDetailsOpen(false);
        setSelectedLead(null);
        setSuccess('Lead updated successfully');
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

      const handleRequestSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
      };

      const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
          const newSelecteds = leads.map((n: Lead) => n.id);
          setSelected(newSelecteds);
          return;
        }
        setSelected([]);
      };

      const handleSelect = (id: string) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
          newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
          newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
          newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
          newSelected = newSelected.concat(
            selected.slice(0, selectedIndex),
            selected.slice(selectedIndex + 1)
          );
        }
        setSelected(newSelected);
      };

      const handleDelete = () => {
        deleteMutation.mutate(selected);
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
              <Tab label={`View Leads (${total})`} />
            </Tabs>
            <TabPanel value={tabValue} index={0}>
              <Card>
                <CardContent>
                  <LeadUpload onUploadComplete={handleUploadComplete} />
                </CardContent>
              </Card>
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <Card>
                <CardHeader
                  title="Your Leads"
                  subheader="Browse and manage your organization's leads"
                  action={
                    <Box sx={{ display: 'flex', gap: 2 }}>
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
                  }
                />
                <TableContainer>
                  {selected.length > 0 && (
                    <Toolbar
                      sx={{
                        bgcolor: 'action.selected',
                        borderRadius: '4px 4px 0 0',
                        borderBottom: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1">
                        {selected.length} selected
                      </Typography>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => setDeleteDialogOpen(true)}>
                          <SafeIcon icon={FiTrash} />
                        </IconButton>
                      </Tooltip>
                    </Toolbar>
                  )}
                  <Table sx={{ minWidth: 750 }}>
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={selected.length > 0 && selected.length < leads.length}
                            checked={leads.length > 0 && selected.length === leads.length}
                            onChange={handleSelectAllClick}
                          />
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'lastName' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'lastName'}
                            direction={orderBy === 'lastName' ? order : 'asc'}
                            onClick={() => handleRequestSort('lastName')}
                          >
                            Name
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell sortDirection={orderBy === 'status' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'status'}
                            direction={orderBy === 'status' ? order : 'asc'}
                            onClick={() => handleRequestSort('status')}
                          >
                            Status
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell sortDirection={orderBy === 'createdAt' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'createdAt'}
                            direction={orderBy === 'createdAt' ? order : 'asc'}
                            onClick={() => handleRequestSort('createdAt')}
                          >
                            Created
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ py: 4 }}><SkeletonLoader type="list" /></TableCell>
                        </TableRow>
                      ) : leads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                            No leads found
                          </TableCell>
                        </TableRow>
                      ) : (
                        leads.map((lead: any) => {
                          const isSelected = selectedSet.has(lead.id);
                          const parsedLocation = parseLeadLocation(lead.location);
                          return (
                            <TableRow key={lead.id} hover selected={isSelected}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onClick={() => handleSelect(lead.id)}
                                />
                              </TableCell>
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
                                  label={parsedLocation ? 'Geocoded' : 'No Location'}
                                  size="small"
                                  variant="outlined"
                                  color={parsedLocation ? 'success' : 'default'}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(lead.createdAt).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<SafeIcon icon={FiEye} />}
                                  onClick={() => handleOpenDetails(lead)}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                  <TablePagination
                  component="div"
                  count={total}
                  page={pagination.page - 1}
                  onPageChange={handlePageChange}
                  rowsPerPage={pagination.rowsPerPage}
                  rowsPerPageOptions={[10, 25]}
                  onRowsPerPageChange={handleRowsPerPageChange}
                />
              </Card>
            </TabPanel>
          </Paper>

          {/* Lead Details Dialog */}
          <Dialog open={isDetailsOpen} onClose={handleCloseDetails} fullWidth maxWidth="md">
            <DialogTitle>Lead Details</DialogTitle>
            <DialogContent>
              {selectedLead && <LeadDetails lead={selectedLead} onUpdate={handleLeadUpdate} />}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={isDeleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
              <Typography>Are you sure you want to delete the {selected.length} selected leads?</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDelete} color="error">
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    };

    export default LeadManagement;