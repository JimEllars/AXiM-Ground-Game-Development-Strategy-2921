import React, { useState, useEffect, useRef } from 'react';
import Map, { Source, Layer, NavigationControl, useControl } from 'react-map-gl';
import { LngLatBounds } from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { Box, CircularProgress } from '@mui/material';
import TerritoryPanel from './TerritoryPanel';
import { useTerritoryPanelState } from '../hooks/useTerritoryPanelState';
import { Territory, User } from '@/types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

function DrawControl(props: any) {
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
  territories: Territory[];
  availableReps: User[];
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
  const mapRef = useRef<any>();
  const [viewState, setViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3.5,
  });

  useEffect(() => {
    if (territories.length > 0 && mapRef.current) {
      const bounds = new LngLatBounds();
      territories.forEach(territory => {
        territory.boundary.coordinates[0].forEach((coord: any) => {
          bounds.extend(coord);
        });
      });
      mapRef.current.fitBounds(bounds, { padding: 40, duration: 1000 });
    }
  }, [territories]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const {
    selectedTerritoryId,
    newTerritory,
    assignRepId,
    setNewTerritory,
    setAssignRepId,
    handleSelectTerritory,
    handleCreateNewTerritory,
    handleCancelNewTerritory,
  } = useTerritoryPanelState();

  const handleSaveNewTerritory = () => {
    if (newTerritory && newTerritory.name) {
      onSaveTerritory(newTerritory);
      handleCancelNewTerritory();
    }
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
    if (!event.features || event.features.length === 0) {
      handleSelectTerritory(null);
      return;
    }
    const territoryFeature = event.features.find((f: any) => f.layer.id === 'territory-fills');
    if (territoryFeature) {
      handleSelectTerritory(territoryFeature.properties.id);
    } else {
      handleSelectTerritory(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '75vh', gap: 2 }}>
      <Box sx={{ flex: 3, position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
        {!mapLoaded && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
          interactiveLayerIds={['territory-fills']}
          onClick={onMapClick}
          onLoad={() => setMapLoaded(true)}
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
                handleCreateNewTerritory(features[0].geometry);
              }
            }}
            onDelete={() => {
              handleCancelNewTerritory();
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

      <TerritoryPanel
        newTerritory={newTerritory}
        selectedTerritory={selectedTerritory}
        availableReps={availableReps}
        assignRepId={assignRepId}
        onNewTerritoryChange={setNewTerritory}
        onSaveNewTerritory={handleSaveNewTerritory}
        onCancelNewTerritory={handleCancelNewTerritory}
        onAssignRepIdChange={setAssignRepId}
        onAssignRep={handleAssignRep}
        onDeleteTerritory={onDeleteTerritory}
      />
    </Box>
  );
};

export default TerritoryMap;
