import AppError from '../AppError.js';

describe('AppError', () => {
  it('should correctly set the message and statusCode properties', () => {
    const message = 'Resource not found';
    const statusCode = 404;
    const error = new AppError(message, statusCode);

    expect(error.message).toBe(message);
    expect(error.statusCode).toBe(statusCode);
  });

  it('should be an instance of Error', () => {
    const error = new AppError('Error', 500);

    expect(error).toBeInstanceOf(Error);
  });

  it('should set isOperational to true', () => {
    const error = new AppError('Error', 500);

    expect(error.isOperational).toBe(true);
  });

  it('should capture the stack trace', () => {
    const error = new AppError('Error', 500);

    expect(error.stack).toBeDefined();
    // Assuming Error.captureStackTrace sets the stack, it should contain the class name
    expect(error.stack).toContain('AppError');
  });
});
