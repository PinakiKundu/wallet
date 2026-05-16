import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logging/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const errorBody = typeof rawResponse === 'object' && rawResponse !== null
      ? rawResponse as Record<string, unknown>
      : {};
    const message = typeof errorBody.message === 'string'
      ? errorBody.message
      : exception instanceof Error
        ? exception.message
        : 'Unexpected error';

    if (status >= 500) {
      this.logger.error(message, exception instanceof Error ? exception.stack : undefined, 'HttpException');
    }

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code: typeof errorBody.error === 'string' ? errorBody.error : 'INTERNAL_ERROR',
        message,
        details: Array.isArray(errorBody.message) ? errorBody.message : undefined
      },
      meta: {
        correlationId: request.correlationId,
        path: request.url
      }
    });
  }
}
