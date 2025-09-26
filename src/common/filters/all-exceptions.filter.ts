import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { StandardResponseDto } from "../types/response.types";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any)?.message || message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = new StandardResponseDto(
      false,
      message,
      null,
      exception instanceof Error ? exception.message : 'Unknown error'
    );

    // Log the error
    this.logger.error(
      `Unhandled Exception: ${status} - ${message}`,
      {
        path: request.url,
        method: request.method,
        statusCode: status,
        timestamp: new Date().toISOString(),
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        stack: exception instanceof Error ? exception.stack : undefined,
      }
    );

    response.status(status).json(errorResponse);
  }
}