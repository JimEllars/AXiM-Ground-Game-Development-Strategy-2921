import { jest } from '@jest/globals';
import logger from '../logger.js';

describe('Logger utility', () => {
  let logSpy: any;
  let warnSpy: any;
  let errorSpy: any;
  let debugSpy: any;
  let originalEnv: string | undefined;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  it('should not log when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';

    logger.info('test info');
    logger.warn('test warn');
    logger.error('test error');
    logger.debug('test debug');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('should log info, warn, and error when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';

    logger.info('test info');
    logger.warn('test warn');
    logger.error('test error');

    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    expect(logSpy.mock.calls[0][1]).toBe('test info');
    expect(warnSpy.mock.calls[0][1]).toBe('test warn');
    expect(errorSpy.mock.calls[0][1]).toBe('test error');
  });

  it('should log debug when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';

    logger.debug('test debug');

    expect(debugSpy).toHaveBeenCalled();
    expect(debugSpy.mock.calls[0][1]).toBe('test debug');
  });

  it('should NOT log debug when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';

    logger.debug('test debug');

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('should log info, warn, and error when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';

    logger.info('test info');
    logger.warn('test warn');
    logger.error('test error');

    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    const infoLog = JSON.parse(logSpy.mock.calls[0][0]);
    expect(infoLog.message).toBe('test info');
    expect(infoLog.level).toBe('INFO');

    const warnLog = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(warnLog.message).toBe('test warn');
    expect(warnLog.level).toBe('WARN');

    const errorLog = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(errorLog.message).toBe('test error');
    expect(errorLog.level).toBe('ERROR');
  });
});
