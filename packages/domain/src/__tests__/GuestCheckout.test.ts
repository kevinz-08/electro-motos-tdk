import { describe, it, expect, vi } from 'vitest'
import { normalizeBuyerIdKey } from '@/domain/entities/Order'
import { validateCouponGuestRule, couponRequiresUniqueRedemption } from '@/domain/entities/Coupon'
import { CreateOrder } from '@/domain/use-cases/orders/CreateOrder'
import { ValidateCoupon } from '@/domain/use-cases/coupons/ValidateCoupon'
import { ok, AppError } from '@/domain/shared/Result'
import type { IOrderRepository } from '@/domain/repositories/IOrderRepository'
import type { IProductRepository } from '@/domain/repositories/IProductRepository'
import type { IPaymentService } from '@/domain/services/IPaymentService'
import type { Product } from '@/domain/entities/Product'

describe('normalizeBuyerIdKey', () => {
  it('CC: solo dígitos', () => {
    expect(normalizeBuyerIdKey('CC', '1.000.123.456')).toBe('CC:1000123456')
    expect(normalizeBuyerIdKey('CC', ' 1000 123 456 ')).toBe('CC:1000123456')
  })

  it('NIT: ignora el dígito de verificación', () => {
    expect(normalizeBuyerIdKey('NIT', '900.123.456-7')).toBe('NIT:900123456')
    expect(normalizeBuyerIdKey('NIT', '900123456')).toBe('NIT:900123456')
  })

  it('CE/PASAPORTE: alfanumérico en mayúsculas', () => {
    expect(normalizeBuyerIdKey('CE', 'e-12345ab')).toBe('CE:E12345AB')
    expect(normalizeBuyerIdKey('PASAPORTE', 'ab 123456')).toBe('PASAPORTE:AB123456')
  })

  it('distingue tipos de documento con el mismo número', () => {
    expect(normalizeBuyerIdKey('CC', '123456')).not.toBe(normalizeBuyerIdKey('CE', '123456'))
  })

  it('retorna vacío si no hay caracteres válidos', () => {
    expect(normalizeBuyerIdKey('CC', 'abc')).toBe('')
  })
})

describe('reglas de cupón para invitados', () => {
  it('FIRST_PURCHASE no puede habilitarse para invitados', () => {
    expect(validateCouponGuestRule('FIRST_PURCHASE', true)).not.toBeNull()
    expect(validateCouponGuestRule('FIRST_PURCHASE', false)).toBeNull()
    expect(validateCouponGuestRule('ONCE_PER_CUSTOMER', true)).toBeNull()
    expect(validateCouponGuestRule('NONE', true)).toBeNull()
  })

  it('solo NONE permite usos repetidos por el mismo cliente', () => {
    expect(couponRequiresUniqueRedemption('NONE')).toBe(false)
    expect(couponRequiresUniqueRedemption('ONCE_PER_CUSTOMER')).toBe(true)
    expect(couponRequiresUniqueRedemption('FIRST_PURCHASE')).toBe(true)
  })
})

// ── CreateOrder como invitado ───────────────────────────────────────────────

const product: Product = {
  id: 'prod-1', name: 'Batería', slug: 'bateria', description: '', price: 5_000_000,
  stock: 10, sku: 'BAT', images: [], isActive: true, weightKg: null, heightCm: null,
  widthCm: null, lengthCm: null, categoryId: 'cat-1', createdAt: new Date(), updatedAt: new Date(),
}

const BASE_INPUT = {
  userId: null,
  items: [{ productId: 'prod-1', quantity: 1 }],
  shippingAddress: { fullName: 'Ana', address: 'Calle 1', city: 'Medellín', phone: '3001234567' },
  buyer: { idType: 'CC' as const, idNumber: '1.000.123.456' },
  paymentProvider: 'WOMPI' as const,
}

function setup() {
  const productRepo = { findById: vi.fn().mockResolvedValue(product) } as unknown as IProductRepository
  const create = vi.fn().mockImplementation(async (input) => ({ id: 'order-1', ...input, status: 'PENDING', createdAt: new Date() }))
  const orderRepo = { create } as unknown as IOrderRepository
  const paymentService = {
    createTransaction: vi.fn().mockResolvedValue({ externalId: null, reference: 'r', integritySignature: 's', publicKey: 'pk', amountInCents: 1, currency: 'COP' }),
  } as unknown as IPaymentService
  return { productRepo, orderRepo, create, paymentService }
}

describe('CreateOrder — guest checkout', () => {
  it('rechaza un invitado sin email válido', async () => {
    const { productRepo, orderRepo, paymentService } = setup()
    const result = await new CreateOrder(orderRepo, productRepo, paymentService).execute({
      ...BASE_INPUT, contactEmail: 'no-es-email',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR')
  })

  it('crea el pedido del invitado con userId null, email normalizado y documento normalizado', async () => {
    const { productRepo, orderRepo, create, paymentService } = setup()
    const result = await new CreateOrder(orderRepo, productRepo, paymentService).execute({
      ...BASE_INPUT, contactEmail: '  Ana@Example.com ',
    })
    expect(result.ok).toBe(true)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: null,
      contactEmail: 'ana@example.com',
      buyerIdKey: 'CC:1000123456',
    }))
  })

  it('registra el uso del cupón con enforceUnique según la restricción', async () => {
    const { productRepo, orderRepo, create, paymentService } = setup()
    const validateCoupon = {
      execute: vi.fn().mockResolvedValue(ok({
        discount: 100, eligibleProductIds: ['prod-1'], couponId: 'coupon-9', restriction: 'ONCE_PER_CUSTOMER',
      })),
    } as unknown as ValidateCoupon

    await new CreateOrder(orderRepo, productRepo, paymentService, undefined, validateCoupon).execute({
      ...BASE_INPUT, contactEmail: 'ana@example.com', couponCode: 'UNAVEZ',
    })

    expect(validateCoupon.execute).toHaveBeenCalledWith(expect.objectContaining({
      userId: null, buyerIdKey: 'CC:1000123456',
    }))
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      couponRedemption: { couponId: 'coupon-9', enforceUnique: true },
    }))
  })

  it('propaga el AppError del repositorio cuando el cupón ya fue usado por un pedido concurrente', async () => {
    const { productRepo, paymentService } = setup()
    const orderRepo = {
      create: vi.fn().mockRejectedValue(new AppError('VALIDATION_ERROR', 'Ya utilizaste este cupón')),
    } as unknown as IOrderRepository
    const validateCoupon = {
      execute: vi.fn().mockResolvedValue(ok({
        discount: 100, eligibleProductIds: ['prod-1'], couponId: 'coupon-9', restriction: 'ONCE_PER_CUSTOMER',
      })),
    } as unknown as ValidateCoupon

    const result = await new CreateOrder(orderRepo, productRepo, paymentService, undefined, validateCoupon).execute({
      ...BASE_INPUT, contactEmail: 'ana@example.com', couponCode: 'UNAVEZ',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.message).toBe('Ya utilizaste este cupón')
    }
  })

  it('rechaza documentos sin caracteres válidos', async () => {
    const { productRepo, orderRepo, paymentService } = setup()
    const result = await new CreateOrder(orderRepo, productRepo, paymentService).execute({
      ...BASE_INPUT, contactEmail: 'ana@example.com', buyer: { idType: 'CC', idNumber: 'abcde' },
    })
    expect(result.ok).toBe(false)
  })
})
