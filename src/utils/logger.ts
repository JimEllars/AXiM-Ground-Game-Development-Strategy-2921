export const logger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.info(message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(message, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env?.DEV) {
      console.debug(message, ...args);
    }
  }
};
export default logger;
