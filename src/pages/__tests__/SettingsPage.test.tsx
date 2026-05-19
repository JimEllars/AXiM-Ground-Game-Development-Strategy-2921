import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SettingsPage from '../SettingsPage';

vi.mock('@/services/api', () => ({
  settingsAPI: {
    getSurveys: vi.fn().mockResolvedValue({ data: [] }),
    createSurvey: vi.fn(),
  },
}));

describe('SettingsPage', () => {
  it('renders the Settings Page', async () => {
    await act(async () => {
      render(<SettingsPage />);
    });
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
