import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
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
  panelVisible: boolean;
  onTogglePanel: () => void;
}

const TerritoryPanel: React.FC<TerritoryPanelProps> = (props) => {
  if (!props.panelVisible) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', pt: 2 }}>
        <Button variant="contained" onClick={props.onTogglePanel} sx={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          Show Panel
        </Button>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ flex: 1, overflowY: 'auto', p: 2, position: 'relative' }}>
      <Button
        onClick={props.onTogglePanel}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          minWidth: 'auto',
          p: 0.5,
        }}
      >
        &times;
      </Button>
      <Box>
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
    </Paper>
  );
};

export default TerritoryPanel;
