import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;
  private context: string = 'Application';

  constructor() {
    // Check if we can write to the file system (for serverless/read-only environments)
    const canWriteToFileSystem = this.canWriteToFileSystem();

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(
            ({ level, message, timestamp, context, ...meta }) => {
              const contextStr =
                typeof context === 'string' ? context : String(this.context);

              const metaStr = Object.keys(meta).length
                ? JSON.stringify(meta)
                : '';
              return `${String(timestamp)} [${contextStr}] ${String(level)}: ${String(message)} ${metaStr}`;
            },
          ),
        ),
      }),
    ];

    // Only add file transports if we can write to the file system
    if (canWriteToFileSystem) {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
      }

      const errorFileTransport = new winston.transports.DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        level: 'error',
      });

      const combinedFileTransport = new winston.transports.DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
      });

      transports.push(errorFileTransport, combinedFileTransport);
    }

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      defaultMeta: { service: 'smart-restaurant' },
      transports,
    });
  }

  private canWriteToFileSystem(): boolean {
    try {
      // Try to create a temporary directory to test write access
      const testDir = path.join(process.cwd(), '.tmp-test');
      fs.mkdirSync(testDir, { recursive: true });
      fs.rmSync(testDir, { recursive: true, force: true });
      return true;
    } catch (error) {
      // If we can't write to the file system, just use console logging
      console.warn(
        'File system is read-only, using console logging only:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return false;
    }
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  log(message: string, context?: string): void {
    if (this.logger) {
      this.logger.info(message, { context: context || this.context });
    }
  }

  error(message: string, trace?: string, context?: string): void {
    if (this.logger) {
      this.logger.error(message, {
        trace,
        context: context || this.context,
        timestamp: new Date().toISOString(),
      });
    }
  }

  warn(message: string, context?: string): void {
    if (this.logger) {
      this.logger.warn(message, { context: context || this.context });
    }
  }

  debug(message: string, context?: string): void {
    if (this.logger) {
      this.logger.debug(message, { context: context || this.context });
    }
  }

  verbose(message: string, context?: string): void {
    if (this.logger) {
      this.logger.verbose(message, { context: context || this.context });
    }
  }

  logError(
    error: unknown,
    context?: string,
    additionalInfo?: Record<string, unknown>,
  ): void {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';

    const errorCode = this.getErrorCode(error);
    const errorName = error instanceof Error ? error.name : 'Error';

    this.error(
      `${errorName}-${errorCode}: ${errorMessage}`,
      errorStack,
      context || this.context,
    );

    if (additionalInfo) {
      this.error(
        `Additional info: ${JSON.stringify(additionalInfo)}`,
        undefined,
        context || this.context,
      );
    }
  }

  private getErrorCode(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return String((error as { code?: unknown }).code);
    }
    return 'NO_CODE';
  }
}
