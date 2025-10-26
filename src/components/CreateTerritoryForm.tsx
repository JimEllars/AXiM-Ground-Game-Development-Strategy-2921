import React from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
} from '@mui/material';
import { FiSave, FiX } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';

interface CreateTerritoryFormProps {
  newTerritory: any;
  onNewTerritoryChange: (territory: any) => void;
  onSaveNewTerritory: () => void;
  onCancelNewTerritory: () => void;
}

const CreateTerritoryForm: React.FC<CreateTerritoryFormProps> = ({
  newTerritory,
  onNewTerritoryChange,
  onSaveNewTerritory,
  onCancelNewTerritory,
}) => {
  return (
    <>
      <Typography variant="h6">Create New Territory</Typography>
      <TextField
        fullWidth
        label="Territory Name"
        value={newTerritory.name}
        onChange={(e) => onNewTerritoryChange({ ...newTerritory, name: e.target.value })}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Description (Optional)"
        value={newTerritory.description}
        onChange={(e) => onNewTerritoryChange({ ...newTerritory, description: e.target.value })}
        margin="normal"
        multiline
        rows={3}
      />
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button
          variant="contained"
          onClick={onSaveNewTerritory}
          startIcon={<SafeIcon icon={FiSave} />}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          onClick={onCancelNewTerritory}
          startIcon={<SafeIcon icon={FiX} />}
        >
          Cancel
        </Button>
      </Box>
    </>
  );
};

export default CreateTerritoryForm;
