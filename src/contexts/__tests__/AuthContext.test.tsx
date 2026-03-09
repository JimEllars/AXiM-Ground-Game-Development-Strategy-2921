import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authAPI } from '@/services/api';

// Mock the API module
jest.mock('@/services/api', () => ({
  authAPI: {
    getProfile: jest.fn(),
    login: jest.fn(),
  },
}));

describe('AuthContext - logout', () => {
  beforeEach(() => {
    // Clear mocks and localStorage before each test
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should clear localStorage and set user to null on logout', async () => {
    // Setup initial state: valid token and mocked profile response
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      organizationId: 'org123',
    };

    localStorage.setItem('token', 'fake-token');
    (authAPI.getProfile as jest.Mock).mockResolvedValueOnce({ data: mockUser });

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
});
