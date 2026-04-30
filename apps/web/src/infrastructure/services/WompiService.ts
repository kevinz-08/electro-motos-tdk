import { createHash, timingSafeEqual } from 'crypto'
import { IPaymentService, PaymentResult } from '@h2r/domain'
import { Order, PaymentStatus } from '@h2r/domain'

/** Estructura del evento de webhook de Wompi */
interface WompiWebhookEvent {
  event: string
  data: {
    transaction: {
      id: string
      reference: string
      status: string
      amount_in_cents: number
      currency: string
    }
  }
  sent_at: string
  timestamp: number
  signature: {
    checksum: string
    properties: string[]
  }
}

/** Respuesta de GET /v1/transactions/:id */
interface WompiTransaction {
  data: {
    id: string
    status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'
    amount_in_cents: number
    reference: string
  }
}

const WOMPI_BASE_URLS = {
  sandbox: 'https://sandbox.wompi.co/v1',
  production: 'https://production.wompi.co/v1',
} as const

/**
 * Ventana máxima aceptada entre el `timestamp` del evento y el momento actual.
 * Previene replay attacks: un evento interceptado no se puede reutilizar más tarde.
 * 10 minutos es generoso para tolerar desviaciones de reloj.
 */
const WEBHOOK_MAX_AGE_SECONDS = 600

/**
 * Implementación de la pasarela Wompi (Colombia).
 * Todos los montos en centavos de COP.
 *
 * @see https://docs.wompi.co
 */
export class WompiService implements IPaymentService {
  private readonly baseUrl: string
  private readonly publicKey: string
  private readonly privateKey: string
  private readonly integritySecret: string
  private readonly eventsSecret: string

  constructor() {
    const env = (process.env['WOMPI_ENV'] ?? 'sandbox') as 'sandbox' | 'production'
    this.baseUrl = WOMPI_BASE_URLS[env]
    this.publicKey = process.env['WOMPI_PUBLIC_KEY'] ?? ''
    this.privateKey = process.env['WOMPI_PRIVATE_KEY'] ?? ''
    this.integritySecret = process.env['WOMPI_INTEGRITY_SECRET'] ?? ''
    this.eventsSecret = process.env['WOMPI_EVENTS_SECRET'] ?? ''
  }

  /**
   * Prepara los parámetros para el Widget de Wompi.
   * Genera la referencia única y firma de integridad SHA256.
   * La firma DEBE calcularse en el servidor — nunca en el cliente.
   */
  async createTransaction(order: Order): Promise<PaymentResult> {
    const reference = `ORDER-${order.id}-${Date.now()}`
    const currency = 'COP'
    const amountInCents = order.total

    const integritySignature = WompiService.computeIntegritySignature(
      reference,
      amountInCents,
      currency,
      this.integritySecret,
    )

    return {
      externalId: null,
      reference,
      integritySignature,
      publicKey: this.publicKey,
      amountInCents,
      currency,
    }
  }

  /** Consulta el estado de una transacción por su ID en Wompi */
  async getTransactionStatus(externalId: string): Promise<PaymentStatus> {
    const response = await fetch(`${this.baseUrl}/transactions/${externalId}`, {
      headers: {
        Authorization: `Bearer ${this.privateKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Wompi API error: ${response.status}`)
    }

    const data = (await response.json()) as WompiTransaction
    const status = data.data.status

    const statusMap: Record<string, PaymentStatus> = {
      PENDING: 'PENDING',
      APPROVED: 'APPROVED',
      DECLINED: 'DECLINED',
      VOIDED: 'VOIDED',
      ERROR: 'ERROR',
    }

    return statusMap[status] ?? 'ERROR'
  }

  /**
   * Valida la firma del webhook de Wompi.
   *
   * Fórmula Wompi:
   *   checksum = SHA256( concat(valores_de_properties) + timestamp + events_secret )
   *
   * Las `properties` son rutas relativas a `data` (ej: "transaction.id" → data.transaction.id).
   *
   * Adicionalmente:
   *  - Comparación con `timingSafeEqual` para evitar timing attacks.
   *  - Rechazo de eventos con `timestamp` fuera de WEBHOOK_MAX_AGE_SECONDS (anti-replay).
   *  - Logs estructurados sin exponer el secret.
   *
   * @see https://docs.wompi.co/docs/colombia/eventos-de-pago/
   */
  validateWebhook(payload: unknown, _headers: Headers): boolean {
    if (!this.eventsSecret) {
      console.error('[Wompi] WOMPI_EVENTS_SECRET no está configurado — webhook no se puede validar')
      return false
    }

    try {
      const event = payload as WompiWebhookEvent
      const { signature, timestamp, data } = event

      if (!signature?.checksum || !Array.isArray(signature?.properties) || !timestamp || !data) {
        console.warn('[Wompi] Webhook rechazado: estructura inválida')
        return false
      }

      const nowSeconds = Math.floor(Date.now() / 1000)
      const ageSeconds = Math.abs(nowSeconds - Number(timestamp))
      if (!Number.isFinite(ageSeconds) || ageSeconds > WEBHOOK_MAX_AGE_SECONDS) {
        console.warn(`[Wompi] Webhook rechazado: timestamp fuera de ventana (${ageSeconds}s)`)
        return false
      }

      // Las properties de Wompi son relativas a `data` — hay que navegar desde ahí.
      const propertyValues = signature.properties.map((prop) => {
        const parts = prop.split('.')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = data
        for (const part of parts) {
          value = value?.[part]
        }
        return value == null ? '' : String(value)
      })

      const stringToHash = `${propertyValues.join('')}${timestamp}${this.eventsSecret}`
      const expectedChecksum = createHash('sha256').update(stringToHash).digest('hex')

      const provided = String(signature.checksum)
      if (provided.length !== expectedChecksum.length) {
        console.warn('[Wompi] Webhook rechazado: checksum con longitud inesperada')
        return false
      }

      const match = timingSafeEqual(
        Buffer.from(provided, 'utf8'),
        Buffer.from(expectedChecksum, 'utf8'),
      )
      if (!match) {
        console.warn('[Wompi] Webhook rechazado: checksum no coincide')
      }
      return match
    } catch (e) {
      console.warn('[Wompi] Webhook rechazado: excepción al validar firma', e)
      return false
    }
  }

  /**
   * Calcula la firma de integridad para el Widget.
   * SHA256(reference + amount_in_cents + currency + integrity_secret)
   */
  static computeIntegritySignature(
    reference: string,
    amountInCents: number,
    currency: string,
    integritySecret: string,
  ): string {
    return createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${integritySecret}`)
      .digest('hex')
  }

  /**
   * Calcula el checksum de un evento de webhook (utilidad para tests y simulación).
   * Expuesto como método estático para permitir generar eventos firmados desde scripts.
   */
  static computeEventChecksum(
    propertyValues: string[],
    timestamp: number,
    eventsSecret: string,
  ): string {
    return createHash('sha256')
      .update(`${propertyValues.join('')}${timestamp}${eventsSecret}`)
      .digest('hex')
  }
}
