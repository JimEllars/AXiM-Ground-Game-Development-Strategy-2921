import React, { useState, useRef, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, useControl } from 'react-map-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import { FiSave, FiX, FiTrash2, FiUserPlus } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

function DrawControl(props) {
  useControl(
    () => new MapboxDraw(props),
    ({ map }) => {
      map.on('draw.create', props.onCreate);
      map.on('draw.delete', props.onDelete);
      map.on('draw.update', props.onUpdate);
    },
    ({ map }) => {
      map.off('draw.create', props.onCreate);
      map.off('draw.delete', props.onDelete);
      map.off('draw.update', props.onUpdate);
    },
    {
      position: props.position,
    }
  );

  return null;
}

interface TerritoryMapProps {
  territories: any[];
  availableReps: any[];
  onSaveTerritory: (data: { name: string; description: string; geoJson: any }) => void;
  onDeleteTerritory: (id: string) => void;
  onAssignTerritory: (territoryId: string, userId: string) => void;
}

const TerritoryMap: React.FC<TerritoryMapProps> = ({
  territories,
  availableReps,
  onSaveTerritory,
  onDeleteTerritory,
  onAssignTerritory,
}) => {
  const [viewState, setViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3.5,
  });
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [newTerritory, setNewTerritory] = useState<any>(null);
  const [assignRepId, setAssignRepId] = useState('');

  const handleSaveNewTerritory = () => {
    if (newTerritory && newTerritory.name) {
      onSaveTerritory(newTerritory);
      setNewTerritory(null);
    }
  };

  const handleCancelNewTerritory = () => {
    setNewTerritory(null);
  };

  const handleAssignRep = () => {
    if (selectedTerritoryId && assignRepId) {
      onAssignTerritory(selectedTerritoryId, assignRepId);
      setAssignRepId('');
    }
  };

  const selectedTerritory = territories.find((t) => t.id === selectedTerritoryId);

  const territoryFeatures = territories.map((t) => ({
    type: 'Feature',
    geometry: t.boundary,
    properties: { id: t.id },
  }));

  const onMapClick = (event: any) => {
    const features = event.features?.filter((f: any) => f.layer.id === 'territory-fills');
    if (features && features.length > 0) {
      const territoryId = features[0].properties.id;
      setSelectedTerritoryId(territoryId);
      setNewTerritory(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '75vh', gap: 2 }}>
      <Box sx={{ flex: 3, position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
          interactiveLayerIds={['territory-fills']}
          onClick={onMapClick}
        >
          <NavigationControl position="top-right" />
          <DrawControl
            position="top-left"
            displayControlsDefault={false}
            controls={{
              polygon: true,
              trash: true,
            }}
            defaultMode="draw_polygon"
            onCreate={({ features }) => {
              if (features[0]) {
                setSelectedTerritoryId(null);
                setNewTerritory({
                  geoJson: features[0].geometry,
                  name: '',
                  description: '',
                });
              }
            }}
            onDelete={() => {
              setNewTerritory(null);
            }}
          />
          <Source
            id="territories-data"
            type="geojson"
            data={{ type: 'FeatureCollection', features: territoryFeatures }}
          >
            <Layer
              id="territory-fills"
              type="fill"
              paint={{
                'fill-color': [
                  'match',
                  ['get', 'id'],
                  selectedTerritoryId || '',
                  '#f57c00', // Selected color
                  '#1976d2', // Default color
                ],
                'fill-opacity': 0.4,
              }}
            />
            <Layer
              id="territory-borders"
              type="line"
              paint={{ 'line-color': '#0d47a1', 'line-width': 2 }}
            />
          </Source>
        </Map>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <Card elevation={2}>
          <CardContent>
            {!newTerritory && !selectedTerritory && (
              <>
                <Typography variant="h6">Territory Management</Typography>
                <Typography variant="body2" color="text.secondary">
                  Use the polygon tool on the map to draw a new territory, or click an existing territory to
                  manage it.
                </Typography>
              </>
            )}

            {newTerritory && (
              <>
                <Typography variant="h6">Create New Territory</Typography>
                <TextField
                  fullWidth
                  label="Territory Name"
                  value={newTerritory.name}
                  onChange={(e) => setNewTerritory({ ...newTerritory, name: e.target.value })}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Description (Optional)"
                  value={newTerritory.description}
                  onChange={(e) => setNewTerritory({ ...newTerritory, description: e.target.value })}
                  margin="normal"
                  multiline
                  rows={3}
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveNewTerritory}
                    startIcon={<SafeIcon icon={FiSave} />}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancelNewTerritory}
                    startIcon={<SafeIcon icon={FiX} />}
                  >
                    Cancel
                  </Button>
                </Box>
              </>
            )}

            {selectedTerritory && (
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
                      onChange={(e) => setAssignRepId(e.target.value)}
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
                    onClick={handleAssignRep}
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
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default TerritoryMap;
