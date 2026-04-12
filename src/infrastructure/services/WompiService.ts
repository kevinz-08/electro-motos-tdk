import { createHash } from 'crypto'
import { IPaymentService, PaymentResult } from '@/domain/services/IPaymentService'
import { Order, PaymentStatus } from '@/domain/entities/Order'

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

    // SHA256(reference + amount_in_cents + currency + integrity_secret)
    const integritySignature = createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${this.integritySecret}`)
      .digest('hex')

    return {
      externalId: null, // Wompi Widget asigna el ID al completar el pago
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

    // Mapeo directo — Wompi usa la misma nomenclatura que nuestro dominio
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
   * Verifica: SHA256(properties_values_joined + timestamp + events_secret) === checksum
   *
   * @see https://docs.wompi.co/docs/colombia/eventos-de-pago/
   */
  validateWebhook(payload: unknown, _headers: Headers): boolean {
    try {
      const event = payload as WompiWebhookEvent
      const { signature, timestamp, data } = event

      if (!signature?.checksum || !signature?.properties || !timestamp) {
        return false
      }

      // Concatenar los valores de las propiedades en el orden indicado por Wompi
      const propertyValues = signature.properties.map((prop) => {
        const parts = prop.split('.')
        // Navegar el objeto anidado (ej: "data.transaction.id")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = { data }
        for (const part of parts) {
          value = value?.[part]
        }
        return String(value ?? '')
      })

      const stringToHash = `${propertyValues.join('')}${timestamp}${this.eventsSecret}`
      const expectedChecksum = createHash('sha256').update(stringToHash).digest('hex')

      return expectedChecksum === signature.checksum
    } catch {
      return false
    }
  }

  /**
   * Calcula solo la firma de integridad (para el endpoint /api/payments/wompi/integrity).
   * Método estático para uso directo sin instanciar la clase completa.
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
}
