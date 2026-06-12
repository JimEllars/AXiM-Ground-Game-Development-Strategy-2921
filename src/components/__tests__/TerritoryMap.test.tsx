import { render } from '@testing-library/react';
import TerritoryMap from '../TerritoryMap';
import { Territory, User } from '@/types';
import mapboxgl from 'mapbox-gl';
import { vi } from 'vitest';

// Mock config to avoid import.meta issues
vi.mock('../../config', () => ({
  config: {
    mapboxToken: 'mock-token',
  },
}));

// Create a spy for the Source component
const SourceSpy = vi.fn(({ children }) => <div>{children}</div>);

// Mock react-map-gl
vi.mock('react-map-gl', () => {
  const React = require('react');
  const MapMock = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      fitBounds: vi.fn(),
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
vi.mock('@mapbox/mapbox-gl-draw', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      onAdd: vi.fn(),
      onRemove: vi.fn(),
    }))
  };
});

// Mock mapbox-gl
vi.mock('mapbox-gl', () => {
  const LngLatBoundsMock = vi.fn().mockImplementation(() => ({
    extend: vi.fn(),
    getNorthEast: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
    getSouthWest: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
  }));
  return {
    default: {
      LngLatBounds: LngLatBoundsMock,
      Map: vi.fn(),
    },
    LngLatBounds: LngLatBoundsMock,
    Map: vi.fn(),
  };
});

// Mock environment variables
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual as any,
    useMediaQuery: vi.fn().mockReturnValue(false), // Desktop view
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
    onSaveTerritory: vi.fn(),
    onDeleteTerritory: vi.fn(),
    onAssignTerritory: vi.fn(),
  };

  beforeEach(() => {
    SourceSpy.mockClear();
    (mapboxgl.LngLatBounds as unknown as ReturnType<typeof vi.fn>).mockClear();
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
