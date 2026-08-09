import MapErrorBoundary from '@/components/MapErrorBoundary';
import { useState, useEffect, useRef, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, useControl } from 'react-map-gl';
import { LngLatBounds } from 'mapbox-gl';

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';

// @ts-ignore
// @ts-ignore
// @ts-ignore
// @ts-ignore
// @ts-ignore
// @ts-ignore
// @ts-ignore
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { Box, Button, useMediaQuery, useTheme } from '@mui/material';
import SkeletonLoader from '@/components/SkeletonLoader';
import TerritoryPanel from './TerritoryPanel';
import { useTerritoryPanelState } from '../hooks/useTerritoryPanelState';
import { Territory, User } from '@/types';
import { config } from '../config';

const MAPBOX_TOKEN = config.mapboxToken;

function DrawControl(props: any) {
  useControl(
    () => new MapboxDraw(props) as any,
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
  onLassoSelect?: (pins: any[]) => void;
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [panelVisible, setPanelVisible] = useState(!isMobile);

  const togglePanel = () => setPanelVisible(!panelVisible);

  const { bounds, territoryData } = useMemo(() => {
    if (territories.length === 0) {
      return { bounds: null, territoryData: { type: 'FeatureCollection', features: [] } };
    }

    const b = new LngLatBounds();
    const features = territories.map((t) => {
      t.boundary.coordinates[0].forEach((coord: any) => {
        b.extend(coord);
      });
      return {
        type: 'Feature',
        geometry: t.boundary,
        properties: { id: t.id },
      };
    });

    return {
      bounds: b,
      territoryData: {
        type: 'FeatureCollection',
        features,
      },
    };
  }, [territories]);

  useEffect(() => {
    if (bounds && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: 40, duration: 1000 });
    }
  }, [bounds]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(true);
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

  const onMapClick = (event: any) => {
    if (!event.features || event.features.length === 0) {
      handleSelectTerritory("");
      return;
    }
    const territoryFeature = event.features.find((f: any) => f.layer.id === 'territory-fills');
    if (territoryFeature) {
      handleSelectTerritory(territoryFeature.properties.id);
    } else {
      handleSelectTerritory("");
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '75vh', gap: 2 }}>
      <Box sx={{ flex: 3, position: 'relative', borderRadius: 1, overflow: 'hidden', height: isMobile ? '50%' : '100%' }}>
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
            <SkeletonLoader type="dashboard" />
          </Box>
        )}
        <MapErrorBoundary>
        <Map transformRequest={(url, resourceType) => {
        if (resourceType === 'Tile' && url.includes('api.mapbox.com')) {
          const proxyUrl = import.meta.env.VITE_AXIM_PROXY_URL;
          if (proxyUrl) {
            return { url: url.replace('https://api.mapbox.com', proxyUrl) };
          }
        }
        return { url };
      }}
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

        <Box sx={{ position: 'absolute', top: 16, right: 60, zIndex: 1, backgroundColor: 'white', padding: 1, borderRadius: 1, boxShadow: 1 }}>
           <Button variant={isDrawingMode ? 'contained' : 'outlined'} size="small" onClick={() => setIsDrawingMode(true)} sx={{ mr: 1 }}>Draw Turf</Button>
           <Button variant={!isDrawingMode ? 'contained' : 'outlined'} size="small" onClick={() => setIsDrawingMode(false)}>Lasso Pins</Button>
        </Box>
          {/* @ts-ignore */} {/* @ts-ignore */} {/* @ts-ignore */} {/* @ts-ignore */} {/* @ts-ignore */} {/* @ts-ignore */} {/* @ts-ignore */} {/* @ts-ignore */} <DrawControl
            position="top-left"
            displayControlsDefault={false}
            controls={{
              polygon: true,
              trash: true,
            }}
            defaultMode="draw_polygon"
            onCreate={({ features }: any) => {
              if (features[0]) {
                const geom = features[0].geometry;
                if (geom.type === 'Polygon' && isDrawingMode) {
                   handleCreateNewTerritory(geom);
                } else if (geom.type === 'Polygon' && onLassoSelect) {
                   // Lasso mode
                   try {
                     const poly = polygon(geom.coordinates);
                     const selectedPins: any[] = [];
                     // We need to access pins. If unassigned pins are in state or passed down:
                     // Wait, we don't have access to pins data directly here unless we fetch them or query the map features
                     // A simple way is to queryRenderedFeatures on the map
                     if (mapRef.current) {
                        const allRenderedPins = mapRef.current.queryRenderedFeatures({ layers: ['unassigned-pins'] });

                        allRenderedPins.forEach(f => {
                           if (f.geometry.type === 'Point') {
                              const pt = point(f.geometry.coordinates as [number, number]);
                              if (booleanPointInPolygon(pt, poly)) {
                                 // To get the full pin data, we can just use the properties
                                 selectedPins.push({
                                    id: f.properties?.id,
                                    ...f.properties
                                 });
                              }
                           }
                        });

                        // Deduplicate by ID
                        const uniquePins = Array.from(new Map(selectedPins.map(p => [p.id, p])).values());
                        onLassoSelect(uniquePins);
                     }
                   } catch(e) {
                     console.error('Lasso select failed', e);
                   }
                }
              }
            }}
            onDelete={() => {
              handleCancelNewTerritory();
            }}
          />
          <Source
            id="territories-data"
            type="geojson"
            data={territoryData}
          >
            <Layer
              id="territory-fills"
              type="fill"
              paint={{
                'fill-color': [
                  'match',
                  ['get', 'id'],
                  selectedTerritoryId || '',
                  '#F59E0B', // Selected color
                  '#1E3A8A', // Default color
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
        </MapErrorBoundary>
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
        panelVisible={panelVisible}
        onTogglePanel={togglePanel}
      />
    </Box>
  );
};

export default TerritoryMap;
