import { LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;

  constructor(level: string) {
    this.logger = pino({
      level,
      redact: {
        paths: ['req.headers.authorization', 'authorization', 'refreshToken', 'otp', 'token'],
        censor: '[REDACTED]'
      }
    });
  }

  log(message: string, context?: string): void {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string): void {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string): void {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: string): void {
    this.logger.trace({ context }, message);
  }
}
