import React, { useState, useCallback, useRef } from 'react';
import Map, {
  NavigationControl,
  Source,
  Layer,
  useControl,
  ControlPosition
} from 'react-map-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Select, MenuItem, FormControl, InputLabel, Alert } from '@mui/material';
import { FiSave, FiTrash2, FiUser, FiMap } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import LoadingSpinner from './LoadingSpinner';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiYXhpbS1kZW1vIiwiYSI6ImNscXBxcGJhZzBsZGQya3F0ZzZwcmltZWUifQ.demo';

interface Territory {
  id: string;
  name: string;
  description?: string;
  boundary: any;
  createdAt: string;
  createdBy?: string;
  assignedTo?: string;
}

interface Rep {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  assignedTerritories: number;
}

interface TerritoryMapProps {
  territories: Territory[];
  onSaveTerritory: (data: { name: string; description: string; geoJson: any }) => void;
  onDeleteTerritory: (id: string) => void;
  onAssignTerritory: (territoryId: string, userId: string) => void;
  availableReps: Rep[];
  loading?: boolean;
  error?: string;
}

// DrawControl Component
const DrawControl = (props: {
  position?: ControlPosition;
  onCreate: (evt: { features: any[] }) => void;
  onUpdate: (evt: { features: any[] }) => void;
  onDelete: (evt: { features: any[] }) => void;
}) => {
  const drawRef = useRef<MapboxDraw | null>(null);
  
  useControl<MapboxDraw>(
    () => {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true
        },
        defaultMode: 'draw_polygon'
      });
      drawRef.current = draw;
      return draw;
    },
    ({ map }) => {
      map.on('draw.create', props.onCreate);
      map.on('draw.update', props.onUpdate);
      map.on('draw.delete', props.onDelete);
    },
    ({ map }) => {
      map.off('draw.create', props.onCreate);
      map.off('draw.update', props.onUpdate);
      map.off('draw.delete', props.onDelete);
    },
    { position: props.position }
  );
  
  return null;
};

const TerritoryMap: React.FC<TerritoryMapProps> = ({
  territories,
  onSaveTerritory,
  onDeleteTerritory,
  onAssignTerritory,
  availableReps,
  loading = false,
  error = ''
}) => {
  const [viewState, setViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 12
  });
  
  const [newFeature, setNewFeature] = useState<any>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  
  // Dialog states
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [territoryName, setTerritoryName] = useState('');
  const [territoryDescription, setTerritoryDescription] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState('');
  
  const handleDrawEvent = useCallback((e: { features: any[] }) => {
    if (e.features.length > 0) {
      setNewFeature(e.features[0]);
    } else {
      setNewFeature(null);
    }
  }, []);
  
  const handleSaveClick = () => {
    if (!newFeature) {
      alert('Please draw a territory first');
      return;
    }
    setSaveDialogOpen(true);
  };
  
  const handleSaveConfirm = () => {
    if (!territoryName.trim()) {
      alert('Please enter a territory name');
      return;
    }
    
    onSaveTerritory({
      name: territoryName.trim(),
      description: territoryDescription.trim(),
      geoJson: newFeature.geometry
    });
    
    // Reset form and drawing
    setTerritoryName('');
    setTerritoryDescription('');
    setNewFeature(null);
    setSaveDialogOpen(false);
  };
  
  const handleAssignClick = (territory: Territory) => {
    setSelectedTerritory(territory);
    setAssignDialogOpen(true);
  };
  
  const handleAssignConfirm = () => {
    if (!selectedTerritory || !selectedRep) {
      alert('Please select a rep');
      return;
    }
    
    onAssignTerritory(selectedTerritory.id, selectedRep);
    setAssignDialogOpen(false);
    setSelectedRep('');
    setSelectedTerritory(null);
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading map..." />;
  }
  
  return (
    <Box sx={{ width: '100%', height: '600px', position: 'relative' }}>
      {error && (
        <Alert severity="error" sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
          {error}
        </Alert>
      )}
      
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <NavigationControl position="bottom-right" />
        <DrawControl 
          position="top-left" 
          onCreate={handleDrawEvent} 
          onUpdate={handleDrawEvent} 
          onDelete={() => setNewFeature(null)} 
        />
        
        {selectedTerritory && (
          <Source 
            id={`territory-${selectedTerritory.id}`} 
            type="geojson" 
            data={{ type: 'Feature', geometry: selectedTerritory.boundary }}
          >
            <Layer 
              id={`fill-${selectedTerritory.id}`} 
              type="fill" 
              paint={{ 'fill-color': '#088', 'fill-opacity': 0.3 }} 
            />
            <Layer 
              id={`stroke-${selectedTerritory.id}`} 
              type="line" 
              paint={{ 'line-color': '#088', 'line-width': 2 }} 
            />
          </Source>
        )}
      </Map>
      
      {/* Territory List */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          zIndex: 1000, 
          width: 300, 
          maxHeight: '80vh', 
          overflow: 'auto', 
          bgcolor: 'white', 
          p: 2, 
          borderRadius: 1, 
          boxShadow: 2 
        }}
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          Territories ({territories.length})
        </Typography>
        
        {newFeature && (
          <Box 
            sx={{ 
              mb: 2, 
              p: 1.5, 
              border: 1, 
              borderColor: 'primary.main', 
              borderRadius: 1, 
              bgcolor: 'primary.light' 
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              New Territory (Unsaved)
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="small" 
              onClick={handleSaveClick}
              startIcon={<SafeIcon icon={FiSave} />}
              fullWidth
              sx={{ mt: 1 }}
            >
              Save New Territory
            </Button>
          </Box>
        )}
        
        {territories.map(territory => (
          <Box 
            key={territory.id} 
            sx={{ 
              mb: 2, 
              p: 1.5, 
              border: 1, 
              borderColor: selectedTerritory?.id === territory.id ? 'primary.main' : 'grey.300', 
              borderRadius: 1, 
              bgcolor: 'white' 
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              {territory.name}
            </Typography>
            {territory.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {territory.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              By: {territory.createdBy}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => setSelectedTerritory(selectedTerritory?.id === territory.id ? null : territory)}
              >
                {selectedTerritory?.id === territory.id ? 'Hide' : 'Show'}
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                color="primary" 
                onClick={() => handleAssignClick(territory)}
                startIcon={<SafeIcon icon={FiUser} />}
              >
                Assign
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                color="error" 
                onClick={() => onDeleteTerritory(territory.id)}
                startIcon={<SafeIcon icon={FiTrash2} />}
              >
                Delete
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
      
      {/* Save Territory Dialog */}
      <Dialog 
        open={saveDialogOpen} 
        onClose={() => setSaveDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Save Territory</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Territory Name"
            fullWidth
            variant="outlined"
            value={territoryName}
            onChange={(e) => setTerritoryName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={territoryDescription}
            onChange={(e) => setTerritoryDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConfirm} variant="contained">Save Territory</Button>
        </DialogActions>
      </Dialog>
      
      {/* Assign Territory Dialog */}
      <Dialog 
        open={assignDialogOpen} 
        onClose={() => setAssignDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Assign Territory to Rep</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Territory: {selectedTerritory?.name}
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Rep</InputLabel>
            <Select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              label="Select Rep"
            >
              {availableReps.map(rep => (
                <MenuItem key={rep.id} value={rep.id}>
                  {rep.firstName} {rep.lastName} ({rep.email}) - {rep.assignedTerritories} territories
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignConfirm} variant="contained">Assign Territory</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TerritoryMap;