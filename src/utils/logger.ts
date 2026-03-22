const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
const isDev = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.DEV : false;

const logger = {
  info: (message: any, ...args: any[]) => {
    if (!isTest) {
      console.log(message, ...args);
    }
  },
  warn: (message: any, ...args: any[]) => {
    if (!isTest) {
      console.warn(message, ...args);
    }
  },
  error: (message: any, ...args: any[]) => {
    if (!isTest) {
      console.error(message, ...args);
    }
  },
  debug: (message: any, ...args: any[]) => {
    if (isDev && !isTest) {
      console.debug(message, ...args);
    }
  }
};

export default logger;
