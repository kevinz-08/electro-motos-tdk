import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { VendeloWebhookGuard } from '../vendelo/guards/vendelo-webhook.guard'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_SECRET = 'test-webhook-secret-32chars-min!!'
const TEST_BODY = Buffer.from('{"event":"ORDER_SHIPPED","data":{}}')

function buildSignature(body: Buffer, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

function buildNowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function makeContext(headers: Record<string, string | undefined>, rawBody: Buffer): ExecutionContext {
  const req = {
    headers,
    rawBody,
  }
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext
}

function makeGuard(secret = TEST_SECRET, isProd = true): VendeloWebhookGuard {
  process.env['VENDELO_WEBHOOK_SECRET'] = secret
  process.env['NODE_ENV'] = isProd ? 'production' : 'development'
  return new VendeloWebhookGuard()
}

// ── Verificación de firma ─────────────────────────────────────────────────────

describe('VendeloWebhookGuard — verificación de firma', () => {
  it('acepta una firma HMAC-SHA256 válida', () => {
    const guard = makeGuard()
    const sig = buildSignature(TEST_BODY, TEST_SECRET)
    const ctx = makeContext({ 'x-vendelo-signature': sig }, TEST_BODY)

    expect(() => guard.canActivate(ctx)).not.toThrow()
  })

  it('rechaza cuando la firma no coincide', () => {
    const guard = makeGuard()
    const ctx = makeContext(
      { 'x-vendelo-signature': 'sha256=invalida' },
      TEST_BODY,
    )

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
  })

  it('rechaza cuando falta el header X-Vendelo-Signature', () => {
    const guard = makeGuard()
    const ctx = makeContext({}, TEST_BODY)

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
  })

  it('rechaza cuando rawBody no está disponible', () => {
    const guard = makeGuard()
    const sig = buildSignature(TEST_BODY, TEST_SECRET)
    const ctx = makeContext({ 'x-vendelo-signature': sig }, undefined as unknown as Buffer)

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
  })

  it('firma de un body diferente no pasa aunque el formato sea correcto', () => {
    const guard = makeGuard()
    const otherBody = Buffer.from('{"event":"MANIPULATED"}')
    const sig = buildSignature(otherBody, TEST_SECRET)
    // Firma es del body manipulado pero el rawBody que llega es el original
    const ctx = makeContext({ 'x-vendelo-signature': sig }, TEST_BODY)

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
  })
})

// ── Protección anti-replay ────────────────────────────────────────────────────

describe('VendeloWebhookGuard — protección anti-replay', () => {
  it('acepta un webhook con timestamp actual', () => {
    const guard = makeGuard()
    const sig = buildSignature(TEST_BODY, TEST_SECRET)
    const ts = String(buildNowSeconds())
    const ctx = makeContext(
      { 'x-vendelo-signature': sig, 'x-vendelo-timestamp': ts },
      TEST_BODY,
    )

    expect(() => guard.canActivate(ctx)).not.toThrow()
  })

  it('rechaza un webhook con timestamp de más de 5 minutos', () => {
    const guard = makeGuard()
    const sig = buildSignature(TEST_BODY, TEST_SECRET)
    const staleTs = String(buildNowSeconds() - 6 * 60) // 6 minutos
    const ctx = makeContext(
      { 'x-vendelo-signature': sig, 'x-vendelo-timestamp': staleTs },
      TEST_BODY,
    )

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
  })

  it('acepta cuando X-Vendelo-Timestamp está ausente (compatibilidad con versiones antiguas de Vendelo)', () => {
    const guard = makeGuard()
    const sig = buildSignature(TEST_BODY, TEST_SECRET)
    const ctx = makeContext({ 'x-vendelo-signature': sig }, TEST_BODY)

    expect(() => guard.canActivate(ctx)).not.toThrow()
  })

  it('rechaza cuando X-Vendelo-Timestamp tiene formato inválido', () => {
    const guard = makeGuard()
    const sig = buildSignature(TEST_BODY, TEST_SECRET)
    const ctx = makeContext(
      { 'x-vendelo-signature': sig, 'x-vendelo-timestamp': 'not-a-number' },
      TEST_BODY,
    )

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
  })
})

// ── Modo desarrollo ───────────────────────────────────────────────────────────

describe('VendeloWebhookGuard — modo desarrollo', () => {
  it('permite requests sin firma en desarrollo cuando el secret está vacío', () => {
    const guard = makeGuard('', false) // secret vacío, dev
    const ctx = makeContext({}, TEST_BODY)

    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('bloquea en producción cuando el secret está vacío', () => {
    const guard = makeGuard('', true) // secret vacío, prod
    const ctx = makeContext({}, TEST_BODY)

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
  })
})
