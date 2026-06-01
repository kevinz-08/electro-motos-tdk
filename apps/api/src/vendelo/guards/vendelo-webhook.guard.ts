import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'crypto'
import type { Request } from 'express'

/**
 * Guard para el webhook del Chatbot Connection de Vendelo.
 *
 * Verificaciones en orden:
 *   1. HMAC-SHA256 del rawBody contra X-Vendelo-Signature (timing-safe)
 *   2. Ventana anti-replay de 5 minutos sobre X-Vendelo-Timestamp (si el header está presente)
 *
 * En desarrollo (NODE_ENV !== 'production') con VENDELO_WEBHOOK_SECRET vacío,
 * el guard deja pasar con warning para facilitar el testing local.
 * En producción, rechaza con 401 si el secret no está configurado.
 */

/** Ventana máxima de aceptación de webhooks en segundos (5 minutos) */
const REPLAY_WINDOW_SECONDS = 5 * 60

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

    this.verifySignature(req)
    this.verifyTimestamp(req)

    return true
  }

  private verifySignature(req: Request): void {
    const signature = req.headers['x-vendelo-signature'] as string | undefined

    if (!signature) {
      throw new UnauthorizedException('Header X-Vendelo-Signature ausente')
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
    if (!rawBody) {
      this.logger.error('[VendeloWebhookGuard] rawBody no disponible — verificar rawBody: true en main.ts')
      throw new UnauthorizedException('Body crudo no disponible para verificación')
    }

    const expected = `sha256=${createHmac('sha256', this.secret).update(rawBody).digest('hex')}`

    // timingSafeEqual previene timing attacks de fuerza bruta sobre la firma
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)

    const valid =
      sigBuf.length === expBuf.length &&
      timingSafeEqual(sigBuf, expBuf)

    if (!valid) {
      this.logger.warn('[VendeloWebhookGuard] Firma inválida — posible webhook falso o secret desincronizado')
      throw new UnauthorizedException('Firma de webhook inválida')
    }
  }

  /**
   * Protección anti-replay usando X-Vendelo-Timestamp (segundos Unix).
   * Solo actúa si el header está presente — mantiene compatibilidad con versiones
   * de Vendelo que aún no lo envían.
   */
  private verifyTimestamp(req: Request): void {
    const tsHeader = req.headers['x-vendelo-timestamp'] as string | undefined
    if (!tsHeader) return

    const ts = Number(tsHeader)
    if (!Number.isFinite(ts)) {
      throw new UnauthorizedException('X-Vendelo-Timestamp tiene formato inválido')
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const age = Math.abs(nowSeconds - ts)

    if (age > REPLAY_WINDOW_SECONDS) {
      this.logger.warn(
        `[VendeloWebhookGuard] Webhook rechazado por replay — antigüedad ${age}s (máx ${REPLAY_WINDOW_SECONDS}s)`,
      )
      throw new UnauthorizedException('Webhook fuera de la ventana de tiempo permitida')
    }
  }
}
