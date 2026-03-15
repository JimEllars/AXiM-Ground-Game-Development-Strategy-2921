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

    expect(logSpy).toHaveBeenCalledWith('test info');
    expect(warnSpy).toHaveBeenCalledWith('test warn');
    expect(errorSpy).toHaveBeenCalledWith('test error');
  });

  it('should log debug when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';

    logger.debug('test debug');

    expect(debugSpy).toHaveBeenCalledWith('test debug');
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

    expect(logSpy).toHaveBeenCalledWith('test info');
    expect(warnSpy).toHaveBeenCalledWith('test warn');
    expect(errorSpy).toHaveBeenCalledWith('test error');
  });
});
