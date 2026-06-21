import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authAPI } from '@/services/api';
import { vi } from 'vitest';

// Mock the API module
vi.mock('@/services/api', () => ({
  authAPI: {
    getProfile: vi.fn(),
    login: vi.fn(),
  },
}));

describe('AuthContext - logout', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    organizationId: 'org123',
  };

  beforeEach(() => {
    // Clear mocks and localStorage before each test
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should clear localStorage and set user to null on logout', async () => {
    // Setup initial state: valid token and mocked profile response
    localStorage.setItem('token', 'fake-token');
    (authAPI.getProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockUser });

    // Render hook inside the AuthProvider
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    // Wait for the initial getProfile to complete and user to be set
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Verify initial conditions
    expect(localStorage.getItem('token')).toBe('fake-token');

    // Perform logout
    act(() => {
      result.current.logout();
    });

    // Verify logout effects
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should handle login error correctly', async () => {
    const errorResponse = { response: { data: { error: 'Invalid credentials' } } };
    (authAPI.login as ReturnType<typeof vi.fn>).mockRejectedValueOnce(errorResponse);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrongpassword');
      } catch (e: any) {
        expect(e.message).toBe('Invalid credentials');
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe('Invalid credentials');
    expect(result.current.loading).toBe(false);
  });

  it('should clear user state on auth-unauthorized event', async () => {
    localStorage.setItem('token', 'fake-token');
    (authAPI.getProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockUser });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    await act(async () => {
      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    });

    expect(result.current.user).toBeNull();
  });
});
