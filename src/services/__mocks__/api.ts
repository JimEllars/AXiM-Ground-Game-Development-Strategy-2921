export const authAPI = {
  getProfile: jest.fn().mockResolvedValue({ data: { id: '1', email: 'test@test.com' } }),
  login: jest.fn().mockResolvedValue({ data: { token: '123', user: { id: '1', email: 'test@test.com' } } }),
};
