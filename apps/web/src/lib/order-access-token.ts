import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Token de acceso a un pedido sin sesión (guest checkout, README §22.4).
 *
 * token = HMAC-SHA256(INTERNAL_API_SECRET, "order-access:" + orderId), en base64url.
 *
 * Determinista a propósito: la cola de correos puede regenerar el enlace
 * /checkout/confirmacion?orderId=...&token=... en cualquier momento sin guardar
 * nada en BD. apps/api/src/shared/order-access-token.ts implementa exactamente el mismo cálculo — ambos lados
 * comparten INTERNAL_API_SECRET.
 */
function secret(): string {
  const value = process.env['INTERNAL_API_SECRET']
  if (!value) throw new Error('INTERNAL_API_SECRET no está definida — no se pueden firmar enlaces de pedido')
  return value
}

export function signOrderAccessToken(orderId: string): string {
  return createHmac('sha256', secret()).update(`order-access:${orderId}`).digest('base64url')
}

export function verifyOrderAccessToken(orderId: string, token: string | null | undefined): boolean {
  if (!token) return false
  const expected = Buffer.from(signOrderAccessToken(orderId))
  const received = Buffer.from(token)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/**
 * Token del enlace "Califica tu compra" (README §22.6): HMAC(INTERNAL_API_SECRET, "review:" + orderItemId).
 * Distinto prefijo que el token de pedido — un enlace de reseña no da acceso al pedido y viceversa.
 */
export function signReviewToken(orderItemId: string): string {
  return createHmac('sha256', secret()).update(`review:${orderItemId}`).digest('base64url')
}

export function verifyReviewToken(orderItemId: string, token: string | null | undefined): boolean {
  if (!token) return false
  const expected = Buffer.from(signReviewToken(orderItemId))
  const received = Buffer.from(token)
  return expected.length === received.length && timingSafeEqual(expected, received)
}
