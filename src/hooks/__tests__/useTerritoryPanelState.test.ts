import { renderHook, act } from '@testing-library/react';
import { useTerritoryPanelState } from '../useTerritoryPanelState';

describe('useTerritoryPanelState', () => {
  it('should initialize with default states', () => {
    const { result } = renderHook(() => useTerritoryPanelState());

    expect(result.current.selectedTerritoryId).toBeNull();
    expect(result.current.newTerritory).toBeNull();
    expect(result.current.assignRepId).toBe('');
  });

  it('should handle selecting a territory', () => {
    const { result } = renderHook(() => useTerritoryPanelState());

    act(() => {
      // Set a new territory first to ensure it gets cleared
      result.current.setNewTerritory({ name: 'Temp' });
    });

    act(() => {
      result.current.handleSelectTerritory('territory-123');
    });

    expect(result.current.selectedTerritoryId).toBe('territory-123');
    expect(result.current.newTerritory).toBeNull();
  });

  it('should handle clearing selection', () => {
    const { result } = renderHook(() => useTerritoryPanelState());

    act(() => {
      result.current.handleSelectTerritory('territory-123');
    });

    expect(result.current.selectedTerritoryId).toBe('territory-123');

    act(() => {
      result.current.handleClearSelection();
    });

    expect(result.current.selectedTerritoryId).toBeNull();
  });

  it('should handle creating a new territory', () => {
    const { result } = renderHook(() => useTerritoryPanelState());
    const mockGeoJson = { type: 'Polygon', coordinates: [] };

    act(() => {
      // Set a selected territory first to ensure it gets cleared
      result.current.setSelectedTerritoryId('territory-123');
    });

    act(() => {
      result.current.handleCreateNewTerritory(mockGeoJson);
    });

    expect(result.current.selectedTerritoryId).toBeNull();
    expect(result.current.newTerritory).toEqual({
      geoJson: mockGeoJson,
      name: '',
      description: '',
    });
  });

  it('should handle canceling a new territory', () => {
    const { result } = renderHook(() => useTerritoryPanelState());

    act(() => {
      result.current.handleCreateNewTerritory({ type: 'Polygon', coordinates: [] });
    });

    expect(result.current.newTerritory).not.toBeNull();

    act(() => {
      result.current.handleCancelNewTerritory();
    });

    expect(result.current.newTerritory).toBeNull();
  });

  it('should support direct state updates', () => {
    const { result } = renderHook(() => useTerritoryPanelState());

    act(() => {
      result.current.setSelectedTerritoryId('direct-id');
      result.current.setNewTerritory({ name: 'Direct New' });
      result.current.setAssignRepId('rep-456');
    });

    expect(result.current.selectedTerritoryId).toBe('direct-id');
    expect(result.current.newTerritory).toEqual({ name: 'Direct New' });
    expect(result.current.assignRepId).toBe('rep-456');
  });
});
