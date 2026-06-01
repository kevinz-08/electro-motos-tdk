import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { createHmac } from 'crypto'
import type { Request } from 'express'

/**
 * Guard para el webhook del Chatbot Connection de Vendelo.
 *
 * Vendelo envía un header X-Vendelo-Signature con el HMAC-SHA256 del body
 * firmado con VENDELO_WEBHOOK_SECRET.
 *
 * En desarrollo (NODE_ENV !== 'production') y con VENDELO_WEBHOOK_SECRET vacío,
 * el guard deja pasar la petición con un warning — facilita el testing local.
 * En producción, si el secret está vacío, rechaza con 401.
 */
@Injectable()
export class VendeloWebhookGuard implements CanActivate {
  private readonly logger = new Logger(VendeloWebhookGuard.name)
  private readonly secret: string
  private readonly isProd: boolean

  constructor() {
    this.secret = process.env['VENDELO_WEBHOOK_SECRET'] ?? ''
    this.isProd = process.env['NODE_ENV'] === 'production'
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.secret) {
      if (this.isProd) {
        this.logger.error('[VendeloWebhookGuard] VENDELO_WEBHOOK_SECRET no configurado en producción')
        throw new UnauthorizedException('Webhook secret no configurado')
      }
      this.logger.warn('[VendeloWebhookGuard] VENDELO_WEBHOOK_SECRET vacío — permitiendo en dev')
      return true
    }

    const req = context.switchToHttp().getRequest<Request>()
    const signature = req.headers['x-vendelo-signature'] as string | undefined

    if (!signature) {
      throw new UnauthorizedException('Header X-Vendelo-Signature ausente')
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
    if (!rawBody) {
      this.logger.error('[VendeloWebhookGuard] rawBody no disponible — verificar que NestJS esté configurado con rawBody: true en main.ts')
      throw new UnauthorizedException('Body crudo no disponible para verificación')
    }

    const expected = createHmac('sha256', this.secret)
      .update(rawBody)
      .digest('hex')

    const valid = signature === `sha256=${expected}`
    if (!valid) {
      this.logger.warn('[VendeloWebhookGuard] Firma inválida — posible webhook falso')
      throw new UnauthorizedException('Firma de webhook inválida')
    }

    return true
  }
}
