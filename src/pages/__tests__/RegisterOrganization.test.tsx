import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterOrganization from '../RegisterOrganization';
import { AuthProvider } from '../../contexts/AuthContext';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  authAPI: {
    registerOrg: vi.fn(),
    login: vi.fn(),
  },
}));

describe('RegisterOrganization', () => {
  it('renders the register form', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <RegisterOrganization />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByTestId('register-button')).toBeInTheDocument();
  });
});
