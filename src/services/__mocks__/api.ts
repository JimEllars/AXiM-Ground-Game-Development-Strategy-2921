import { vi } from 'vitest';

export const authAPI = {
  getProfile: vi.fn().mockResolvedValue({ data: { id: '1', email: 'test@test.com' } }),
  login: vi.fn().mockResolvedValue({ data: { token: '123', user: { id: '1', email: 'test@test.com' } } }),
};
