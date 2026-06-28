import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import SettingsPage from '../SettingsPage';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({ logout: vi.fn() }),
}));

vi.mock('@/services/api', () => ({
  settingsAPI: {
    getSurveys: vi.fn().mockResolvedValue({ data: { surveys: [] } }),
    createSurvey: vi.fn(),
  },
  leadsAPI: {
    export: vi.fn()
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('SettingsPage', () => {
  it('renders the Settings Page', async () => {
    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <SettingsPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
    });
    expect(screen.getByText('Wipe Local Node Secure Storage')).toBeInTheDocument();
  });
});
