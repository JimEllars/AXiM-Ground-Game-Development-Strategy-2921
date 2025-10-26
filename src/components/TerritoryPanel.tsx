import React from 'react';
import { Box, Typography } from '@mui/material';
import CreateTerritoryForm from './CreateTerritoryForm';
import TerritoryDetails from './TerritoryDetails';

interface TerritoryPanelProps {
  newTerritory: any;
  selectedTerritory: any;
  availableReps: any[];
  assignRepId: string;
  onNewTerritoryChange: (territory: any) => void;
  onSaveNewTerritory: () => void;
  onCancelNewTerritory: () => void;
  onAssignRepIdChange: (repId: string) => void;
  onAssignRep: () => void;
  onDeleteTerritory: (territoryId: string) => void;
}

const TerritoryPanel: React.FC<TerritoryPanelProps> = (props) => {
  return (
    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        {!props.newTerritory && !props.selectedTerritory && (
          <>
            <Typography variant="h6">Territory Management</Typography>
            <Typography variant="body2" color="text.secondary">
              Use the polygon tool on the map to draw a new territory, or click an existing territory to manage it.
            </Typography>
          </>
        )}

        {props.newTerritory && <CreateTerritoryForm {...props} />}

        {props.selectedTerritory && <TerritoryDetails {...props} />}
      </Box>
    </Box>
  );
};

export default TerritoryPanel;
