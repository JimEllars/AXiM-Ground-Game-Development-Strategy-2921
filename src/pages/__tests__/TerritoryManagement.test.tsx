import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TerritoryManagement from '../TerritoryManagement';
import { territoriesAPI } from '@/services/api';

// Mock API
jest.mock('@/services/api', () => ({
  territoriesAPI: {
    getAll: jest.fn(),
    getAvailableReps: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    assign: jest.fn(),
  },
}));

// Mock TerritoryMap component to expose onDeleteTerritory prop
jest.mock('@/components/TerritoryMap', () => (props: any) => (
  <div data-testid="territory-map">
    <button
      data-testid="delete-btn"
      onClick={() => props.onDeleteTerritory(props.territories[0].id)}
    >
      Trigger Delete
    </button>
  </div>
));

describe('TerritoryManagement', () => {
  const mockTerritories = [
    { id: 't1', name: 'Territory 1', boundary: { coordinates: [] } },
  ];
  const mockReps = [
    { id: 'u1', firstName: 'John', lastName: 'Doe' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (territoriesAPI.getAll as jest.Mock).mockResolvedValue({ data: mockTerritories });
    (territoriesAPI.getAvailableReps as jest.Mock).mockResolvedValue({ data: mockReps });
  });

  it('shows confirmation dialog with correct message on delete', async () => {
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => true);

    await act(async () => {
      render(<TerritoryManagement />);
    });

    // Wait for map (and button) to appear
    await waitFor(() => expect(screen.getByTestId('delete-btn')).toBeInTheDocument());

    // Click delete
    fireEvent.click(screen.getByTestId('delete-btn'));

    // Verify confirm called with correct message
    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to delete the territory "Territory 1"? This action will NOT delete the leads within the territory.'
    );

    // Verify API called
    expect(territoriesAPI.delete).toHaveBeenCalledWith('t1');

    confirmSpy.mockRestore();
  });
});
