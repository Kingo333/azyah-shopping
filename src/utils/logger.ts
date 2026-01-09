/**
 * Production-safe logging utility
 * - Completely disabled in production builds
 * - Only errors are always logged
 * - Prevents console.log from retaining large objects in memory
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => { if (isDev) console.log(...args); },
  warn: (...args: any[]) => { if (isDev) console.warn(...args); },
  error: console.error, // Always enabled - errors should always be logged
  debug: (...args: any[]) => { if (isDev) console.debug(...args); },
  info: (...args: any[]) => { if (isDev) console.info(...args); },
};

export default logger;
