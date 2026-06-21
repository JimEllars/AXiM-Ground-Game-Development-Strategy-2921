import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  TablePagination
} from '@mui/material';
import { FiTrash2, FiUserPlus } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';

interface TerritoryDetailsProps {
  selectedTerritory: any;
  availableReps: any[];
  assignRepId: string;
  onAssignRepIdChange: (repId: string) => void;
  onAssignRep: () => void;
  onDeleteTerritory: (territoryId: string) => void;
}

const TerritoryDetails: React.FC<TerritoryDetailsProps> = ({
  selectedTerritory,
  availableReps,
  assignRepId,
  onAssignRepIdChange,
  onAssignRep,
  onDeleteTerritory,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const leads = selectedTerritory.leads || [];
  const paginatedLeads = leads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <Typography variant="h6">{selectedTerritory.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {selectedTerritory.description || 'No description'}
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" gutterBottom>
        Assign Representative
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <FormControl fullWidth size="small">
          <InputLabel>Select Rep</InputLabel>
          <Select
            value={assignRepId}
            onChange={(e) => onAssignRepIdChange(e.target.value)}
            label="Select Rep"
          >
            {availableReps.map((rep) => (
              <MenuItem key={rep.id} value={rep.id}>
                {rep.firstName} {rep.lastName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={onAssignRep}
          disabled={!assignRepId}
          startIcon={<SafeIcon icon={FiUserPlus} />}
        >
          Assign
        </Button>
      </Box>

      {leads.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Leads in Territory
          </Typography>
          <List dense>
            {paginatedLeads.map((lead: any) => (
              <ListItem key={lead.id}>
                <ListItemText
                  primary={`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed Lead'}
                  secondary={lead.streetAddress}
                />
              </ListItem>
            ))}
          </List>
          <TablePagination
                    sx={{ '.MuiTablePagination-actions button': { minWidth: 44, minHeight: 44 } }}
                    component="div"
            count={leads.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25]}
          />
        </>
      )}

      <Divider sx={{ my: 2 }} />
      <Button
        fullWidth
        variant="outlined"
        color="error"
        onClick={() => onDeleteTerritory(selectedTerritory.id)}
        startIcon={<SafeIcon icon={FiTrash2} />}
      >
        Delete Territory
      </Button>
    </>
  );
};

export default TerritoryDetails;
