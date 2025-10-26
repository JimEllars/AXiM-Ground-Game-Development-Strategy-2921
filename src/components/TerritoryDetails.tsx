import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  TextField,
} from '@mui/material';
import { FiTrash2, FiUserPlus, FiEdit, FiSave, FiX } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';

interface TerritoryDetailsProps {
  selectedTerritory: any;
  availableReps: any[];
  assignRepId: string;
  onAssignRepIdChange: (repId: string) => void;
  onAssignRep: () => void;
  onDeleteTerritory: (territoryId: string) => void;
  onEditTerritory: (id: string, data: any) => void;
}

const TerritoryDetails: React.FC<TerritoryDetailsProps> = ({
  selectedTerritory,
  availableReps,
  assignRepId,
  onAssignRepIdChange,
  onAssignRep,
  onDeleteTerritory,
  onEditTerritory,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTerritory, setEditedTerritory] = useState(selectedTerritory);

  useEffect(() => {
    setEditedTerritory(selectedTerritory);
  }, [selectedTerritory]);

  const handleSave = () => {
    onEditTerritory(selectedTerritory.id, {
      name: editedTerritory.name,
      description: editedTerritory.description,
      geoJson: selectedTerritory.boundary,
    });
    setIsEditing(false);
  };

  return (
    <>
      {isEditing ? (
        <Box>
          <TextField
            fullWidth
            label="Territory Name"
            value={editedTerritory.name}
            onChange={(e) => setEditedTerritory({ ...editedTerritory, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={editedTerritory.description}
            onChange={(e) => setEditedTerritory({ ...editedTerritory, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              startIcon={<SafeIcon icon={FiSave} />}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              onClick={() => setIsEditing(false)}
              startIcon={<SafeIcon icon={FiX} />}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      ) : (
        <>
          <Typography variant="h6">{selectedTerritory.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedTerritory.description || 'No description'}
          </Typography>
          <Button
            size="small"
            onClick={() => setIsEditing(true)}
            startIcon={<SafeIcon icon={FiEdit} />}
            sx={{ mb: 2 }}
          >
            Edit
          </Button>
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
