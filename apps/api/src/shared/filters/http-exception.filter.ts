import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AppError } from '@h2r/domain'

/** Mapeo de AppError.code del dominio a status HTTP */
const DOMAIN_ERROR_STATUS: Record<string, number> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,                      // 404
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,                 // 401
  FORBIDDEN: HttpStatus.FORBIDDEN,                       // 403
  VALIDATION_ERROR: HttpStatus.UNPROCESSABLE_ENTITY,    // 422
  CONFLICT: HttpStatus.CONFLICT,                         // 409
  STOCK_UNAVAILABLE: HttpStatus.CONFLICT,                // 409
  PAYMENT_REQUIRED: HttpStatus.PAYMENT_REQUIRED,         // 402
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,      // 500
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    // AppError del dominio: se convierte a HTTP con el código correcto
    if (exception instanceof AppError) {
      const status = DOMAIN_ERROR_STATUS[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR
      if (status >= 500) {
        this.logger.error(`[${exception.code}] ${exception.message}`, exception.stack)
      }
      return response.status(status).json({
        statusCode: status,
        code: exception.code,
        message: exception.message,
        path: request.url,
        timestamp: new Date().toISOString(),
      })
    }

    // HttpException de NestJS (lanzadas desde guards, pipes, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()
      return response.status(status).json({
        statusCode: status,
        ...(typeof body === 'string' ? { message: body } : body),
        path: request.url,
        timestamp: new Date().toISOString(),
      })
    }

    // Error inesperado: no exponer stack en producción
    this.logger.error('Error no manejado', exception instanceof Error ? exception.stack : String(exception))
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: process.env['NODE_ENV'] === 'production'
        ? 'Error interno del servidor'
        : String(exception),
      path: request.url,
      timestamp: new Date().toISOString(),
    })
  }
}
