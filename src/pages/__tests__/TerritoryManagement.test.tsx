import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from 'react-query';
import TerritoryManagement from '../TerritoryManagement';
import { territoriesAPI } from '@/services/api';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock API
vi.mock('@/services/api', () => ({
  territoriesAPI: {
    getAll: vi.fn(),
    getAvailableReps: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    assign: vi.fn(),
  },
}));

// Mock TerritoryMap component to expose onDeleteTerritory prop
vi.mock('@/components/TerritoryMap', () => ({
  default: (props: any) => (
    <div data-testid="territory-map">
      <button
        data-testid="delete-btn"
        onClick={() => props.onDeleteTerritory(props.territories[0].id)}
      >
        Trigger Delete
      </button>
    </div>
  ),
}));

describe('TerritoryManagement', () => {
  const mockTerritories = [
    { id: 't1', name: 'Territory 1', boundary: { coordinates: [] } },
  ];
  const mockReps = [
    { id: 'u1', firstName: 'John', lastName: 'Doe' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (territoriesAPI.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockTerritories });
    (territoriesAPI.getAvailableReps as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockReps });
  });

  it('shows confirmation dialog with correct message on delete', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => true);

    const queryClient = createTestQueryClient();
    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TerritoryManagement />
        </QueryClientProvider>
      );
    });

    // Wait for map (and button) to appear
    await waitFor(() => expect(screen.getByTestId('delete-btn')).toBeInTheDocument());

    // Click delete
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-btn'));
    });

    // Verify confirm called with correct message
    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to delete the territory "Territory 1"? This action will NOT delete the leads within the territory.'
    );

    // Verify API called
    await waitFor(() => {
      expect(territoriesAPI.delete).toHaveBeenCalledWith('t1');
    });

    confirmSpy.mockRestore();
  });

  it('shows error message when territory deletion fails', async () => {
    // Mock window.confirm to proceed
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => true);

    // Mock delete API to fail
    (territoriesAPI.delete as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { error: 'Deletion failed' } },
    });

    const queryClient = createTestQueryClient();
    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TerritoryManagement />
        </QueryClientProvider>
      );
    });

    // Wait for map to appear
    await waitFor(() => expect(screen.getByTestId('delete-btn')).toBeInTheDocument());

    // Click delete
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-btn'));
    });

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Deletion failed')).toBeInTheDocument();
    });

    // Verify confirm was called
    expect(confirmSpy).toHaveBeenCalled();
    // Verify API was called
    expect(territoriesAPI.delete).toHaveBeenCalledWith('t1');

    confirmSpy.mockRestore();
  });
});
