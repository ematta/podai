import winston from 'winston';
import { settings } from './settings.js';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, service }) => {
    return `${timestamp} [${service}] ${level.toUpperCase()}: ${message}`;
  })
);

// Create the logger
export const createLogger = (serviceName: string) => {
  return winston.createLogger({
    level: settings.LOG_LEVEL,
    format: logFormat,
    defaultMeta: { service: serviceName },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      }),
      // Add file transport for production
      ...(settings.NODE_ENV === 'production' 
        ? [
            new winston.transports.File({ 
              filename: 'error.log', 
              level: 'error' 
            }),
            new winston.transports.File({ 
              filename: 'combined.log' 
            })
          ] 
        : [])
    ]
  });
};

// Default logger
export const logger = createLogger('app');
