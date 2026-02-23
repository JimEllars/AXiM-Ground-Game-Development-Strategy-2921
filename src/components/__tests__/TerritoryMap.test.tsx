import React from 'react';
import { render } from '@testing-library/react';
import TerritoryMap from '../TerritoryMap';
import { Territory, User } from '@/types';
import mapboxgl from 'mapbox-gl';

// Mock config to avoid import.meta issues
jest.mock('../../config', () => ({
  config: {
    mapboxToken: 'mock-token',
  },
}));

// Create a spy for the Source component
const SourceSpy = jest.fn(({ children }) => <div>{children}</div>);

// Mock react-map-gl
jest.mock('react-map-gl', () => {
  const React = require('react');
  const MapMock = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      fitBounds: jest.fn(),
    }));
    return React.createElement('div', null, props.children);
  });
  return {
    __esModule: true,
    default: MapMock,
    Map: MapMock,
    Source: (props: any) => {
      SourceSpy(props);
      return React.createElement('div', null, props.children);
    },
    Layer: () => React.createElement('div'),
    NavigationControl: () => React.createElement('div'),
    useControl: () => {},
  };
});

// Mock mapbox-gl-draw
jest.mock('@mapbox/mapbox-gl-draw', () => {
  return jest.fn().mockImplementation(() => ({
    onAdd: jest.fn(),
    onRemove: jest.fn(),
  }));
});

// Mock mapbox-gl
jest.mock('mapbox-gl', () => {
  return {
    LngLatBounds: jest.fn().mockImplementation(() => ({
      extend: jest.fn(),
      getNorthEast: jest.fn().mockReturnValue({ lat: 0, lng: 0 }),
      getSouthWest: jest.fn().mockReturnValue({ lat: 0, lng: 0 }),
    })),
    Map: jest.fn(),
  };
});

// Mock environment variables
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: jest.fn().mockReturnValue(false), // Desktop view
  };
});

describe('TerritoryMap Benchmark', () => {
  const mockTerritories: Territory[] = Array.from({ length: 100 }).map((_, i) => ({
    id: `t${i}`,
    name: `Territory ${i}`,
    organizationId: 'org1',
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 10],
          [10, 10],
          [10, 0],
          [0, 0],
        ],
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const mockReps: User[] = [];

  const mockHandlers = {
    onSaveTerritory: jest.fn(),
    onDeleteTerritory: jest.fn(),
    onAssignTerritory: jest.fn(),
  };

  beforeEach(() => {
    SourceSpy.mockClear();
    (mapboxgl.LngLatBounds as unknown as jest.Mock).mockClear();
  });

  it('verifies optimization of territoryFeatures and bounds calculation', () => {
    const { rerender } = render(
      <TerritoryMap
        territories={mockTerritories}
        availableReps={mockReps}
        {...mockHandlers}
      />
    );

    // Initial render checks
    expect(SourceSpy).toHaveBeenCalledTimes(1);
    const firstCallData = SourceSpy.mock.calls[0][0].data;

    // Check bounds calculation happened
    expect(mapboxgl.LngLatBounds).toHaveBeenCalled();

    // Re-render with same props
    rerender(
      <TerritoryMap
        territories={mockTerritories}
        availableReps={mockReps}
        {...mockHandlers}
      />
    );

    expect(SourceSpy).toHaveBeenCalledTimes(2);
    const secondCallData = SourceSpy.mock.calls[1][0].data;

    // Check if data reference is the same (after optimization)
    expect(firstCallData).toBe(secondCallData);
  });
});
