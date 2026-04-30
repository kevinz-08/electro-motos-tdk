import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import { Order } from '@h2r/domain'

@Injectable()
export class ResendEmailService {
  private readonly resend: Resend | null
  private readonly from: string

  constructor() {
    const apiKey = process.env['RESEND_API_KEY']
    this.resend = apiKey ? new Resend(apiKey) : null
    this.from = process.env['RESEND_FROM_EMAIL'] ?? 'no-reply@h2ronlinestore.co'
    if (!apiKey) {
      console.warn('[ResendEmailService] RESEND_API_KEY no configurada — los emails no se enviarán')
    }
  }

  async sendOrderConfirmation(order: Order, customerEmail: string): Promise<void> {
    if (!this.resend) return
    await this.resend.emails.send({
      from: this.from,
      to: customerEmail,
      subject: `¡Tu pedido #${order.id.slice(-8).toUpperCase()} fue confirmado! 🏍️`,
      html: this.orderConfirmationHtml(order),
    })
  }

  async sendShippingNotification(order: Order, customerEmail: string, trackingNumber?: string): Promise<void> {
    if (!this.resend) return
    await this.resend.emails.send({
      from: this.from,
      to: customerEmail,
      subject: `Tu pedido #${order.id.slice(-8).toUpperCase()} fue enviado`,
      html: this.shippingNotificationHtml(order, trackingNumber),
    })
  }

  async sendPaymentDeclined(order: Order, customerEmail: string): Promise<void> {
    if (!this.resend) return
    await this.resend.emails.send({
      from: this.from,
      to: customerEmail,
      subject: `Problema con tu pago — Pedido #${order.id.slice(-8).toUpperCase()}`,
      html: this.paymentDeclinedHtml(order),
    })
  }

  private formatCOP(cents: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cents / 100)
  }

  private orderConfirmationHtml(order: Order): string {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#1a1a2e;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:#f59e0b;margin:0;">⚡ H2R Online Store</h1>
  </div>
  <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;">
    <h2 style="color:#16a34a;">¡Tu pedido fue confirmado!</h2>
    <p>Número de pedido: <strong>#${order.id.slice(-8).toUpperCase()}</strong></p>
    <p>Total: <strong>${this.formatCOP(order.total)}</strong></p>
    <p>Dirección de envío: ${order.shippingAddress.address}, ${order.shippingAddress.city}</p>
    <hr style="border:1px solid #e5e7eb;margin:20px 0;">
    <p style="font-size:14px;color:#6b7280;">Te notificaremos cuando tu pedido sea despachado.</p>
  </div>
</body></html>`
  }

  private shippingNotificationHtml(order: Order, trackingNumber?: string): string {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#1a1a2e;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:#f59e0b;margin:0;">⚡ H2R Online Store</h1>
  </div>
  <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;">
    <h2 style="color:#2563eb;">¡Tu pedido está en camino! 🚚</h2>
    <p>Pedido: <strong>#${order.id.slice(-8).toUpperCase()}</strong></p>
    ${trackingNumber ? `<p>Número de seguimiento: <strong>${trackingNumber}</strong></p>` : ''}
    <p>Destino: ${order.shippingAddress.address}, ${order.shippingAddress.city}</p>
  </div>
</body></html>`
  }

  private paymentDeclinedHtml(order: Order): string {
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000'
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#1a1a2e;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:#f59e0b;margin:0;">⚡ H2R Online Store</h1>
  </div>
  <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;">
    <h2 style="color:#dc2626;">Hubo un problema con tu pago</h2>
    <p>Pedido: <strong>#${order.id.slice(-8).toUpperCase()}</strong></p>
    <p>Total: ${this.formatCOP(order.total)}</p>
    <a href="${frontendUrl}/carrito"
       style="display:inline-block;background:#f59e0b;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px;">
      Volver al carrito
    </a>
  </div>
</body></html>`
  }
}
