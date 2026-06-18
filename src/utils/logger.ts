export const logger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.info(JSON.stringify({ level: 'info', message, args, timestamp: new Date().toISOString() }));
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(JSON.stringify({ level: 'warn', message, args, timestamp: new Date().toISOString() }));
    }
  },
  error: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({ level: 'error', message, args, timestamp: new Date().toISOString() }));
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env?.DEV) {
      console.debug(JSON.stringify({ level: 'debug', message, args, timestamp: new Date().toISOString() }));
    }
  }
};
export default logger;
