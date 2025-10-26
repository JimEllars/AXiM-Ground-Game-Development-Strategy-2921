import React from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
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
