// path: backend/src/common/utils/error-handler.util.ts
// purpose: Centralized error handling utility for enterprise logging
// dependencies: NestJS Logger

import { Logger } from "@nestjs/common";

export function logError(logger: Logger, message: string, error: any): void {
  logger.error(message);
  
  if (error instanceof Error) {
    logger.error(`Error Name: ${error.name}`);
    logger.error(`Error Message: ${error.message}`);
    logger.error(`Stack Trace: ${error.stack}`);
  } else {
    logger.error(`Error Details: ${JSON.stringify(error, null, 2)}`);
  }
  
  // Additional context for debugging
  logger.error(`Timestamp: ${new Date().toISOString()}`);
  logger.error(`Process ID: ${process.pid}`);
  logger.error(`Memory Usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`);
}