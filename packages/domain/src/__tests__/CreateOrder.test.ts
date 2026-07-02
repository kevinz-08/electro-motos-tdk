import { describe, it, expect, vi } from 'vitest'
import { CreateOrder } from '@/domain/use-cases/orders/CreateOrder'
import type { IOrderRepository } from '@/domain/repositories/IOrderRepository'
import type { IProductRepository } from '@/domain/repositories/IProductRepository'
import type { IPaymentService } from '@/domain/services/IPaymentService'
import type { Product } from '@/domain/entities/Product'
import type { Order } from '@/domain/entities/Order'

// ── Factories ─────────────────────────────────────────────────────────────────

function makeProduct(overrides?: Partial<Product>): Product {
  return {
    id: 'prod-1',
    name: 'Batería 12V',
    slug: 'bateria-12v',
    description: 'Batería estándar para motos',
    price: 5000000, // 50,000 COP en centavos
    stock: 10,
    sku: 'BAT-12V',
    images: [],
    isActive: true,
    weightKg: null,
    heightCm: null,
    widthCm: null,
    lengthCm: null,
    categoryId: 'cat-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function makeOrder(overrides?: Partial<Order>): Order {
  return {
    id: 'order-1',
    userId: 'user-1',
    status: 'PENDING',
    total: 5000000,
    shippingAddress: {
      fullName: 'Carlos Pérez',
      address: 'Calle 123 #45-67',
      city: 'Bogotá',
      department: 'Cundinamarca',
      phone: '3001234567',
    },
    buyer: { idType: 'CC', idNumber: '1000123456' },
    paymentProvider: 'WOMPI',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

const SHIPPING = {
  fullName: 'Carlos Pérez',
  address: 'Calle 123 #45-67',
  city: 'Bogotá',
  department: 'Cundinamarca',
  phone: '3001234567',
} as const

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateOrder', () => {
  it('retorna ok con el total calculado correctamente en el happy path', async () => {
    const product = makeProduct()
    const order = makeOrder({ total: product.price * 2 })

    const productRepo = {
      findById: vi.fn().mockResolvedValue(product),
    } as unknown as IProductRepository

    const orderRepo = {
      create: vi.fn().mockResolvedValue(order),
    } as unknown as IOrderRepository

    const paymentService = {
      createTransaction: vi.fn().mockResolvedValue({
        externalId: null,
        reference: 'ORDER-order-1-123',
        integritySignature: 'abc123',
        publicKey: 'pub-key',
        amountInCents: order.total,
        currency: 'COP',
      }),
    } as unknown as IPaymentService

    const result = await new CreateOrder(orderRepo, productRepo, paymentService).execute({
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddress: SHIPPING,
      buyer: { idType: 'CC', idNumber: '1000123456' },
      paymentProvider: 'WOMPI',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.order.total).toBe(product.price * 2)
    }
  })

  it('llama a orderRepo.create con los ítems resueltos y el total correcto', async () => {
    const product = makeProduct({ price: 3000000 })
    const order = makeOrder({ total: product.price * 3 })

    const productRepo = {
      findById: vi.fn().mockResolvedValue(product),
    } as unknown as IProductRepository

    const create = vi.fn().mockResolvedValue(order)
    const orderRepo = { create } as unknown as IOrderRepository

    const paymentService = {
      createTransaction: vi.fn().mockResolvedValue({ externalId: null, reference: 'ref', integritySignature: 'sig', publicKey: 'pk', amountInCents: order.total, currency: 'COP' }),
    } as unknown as IPaymentService

    await new CreateOrder(orderRepo, productRepo, paymentService).execute({
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 3 }],
      shippingAddress: SHIPPING,
      buyer: { idType: 'CC', idNumber: '1000123456' },
      paymentProvider: 'WOMPI',
    })

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      total: product.price * 3,
      items: [{ productId: 'prod-1', quantity: 3, priceAtPurchase: product.price }],
    }))
  })

  it('retorna err(STOCK_UNAVAILABLE) cuando la cantidad supera el stock disponible', async () => {
    const product = makeProduct({ stock: 2 })

    const productRepo = {
      findById: vi.fn().mockResolvedValue(product),
    } as unknown as IProductRepository

    const result = await new CreateOrder(
      {} as IOrderRepository,
      productRepo,
      {} as IPaymentService,
    ).execute({
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 5 }],
      shippingAddress: SHIPPING,
      buyer: { idType: 'CC', idNumber: '1000123456' },
      paymentProvider: 'WOMPI',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('STOCK_UNAVAILABLE')
  })

  it('retorna err(NOT_FOUND) cuando el producto no existe en el repositorio', async () => {
    const productRepo = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as IProductRepository

    const result = await new CreateOrder(
      {} as IOrderRepository,
      productRepo,
      {} as IPaymentService,
    ).execute({
      userId: 'user-1',
      items: [{ productId: 'prod-inexistente', quantity: 1 }],
      shippingAddress: SHIPPING,
      buyer: { idType: 'CC', idNumber: '1000123456' },
      paymentProvider: 'WOMPI',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
  })

  it('retorna err(VALIDATION_ERROR) cuando la cantidad del ítem es 0', async () => {
    const result = await new CreateOrder(
      {} as IOrderRepository,
      { findById: vi.fn() } as unknown as IProductRepository,
      {} as IPaymentService,
    ).execute({
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 0 }],
      shippingAddress: SHIPPING,
      buyer: { idType: 'CC', idNumber: '1000123456' },
      paymentProvider: 'WOMPI',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR')
  })

  it('COD: crea el pedido vía createPaidOrder y no llama a paymentService', async () => {
    const product = makeProduct()
    const order = makeOrder({ total: product.price * 2, paymentProvider: 'COD', status: 'PAID' })

    const productRepo = {
      findById: vi.fn().mockResolvedValue(product),
    } as unknown as IProductRepository

    const createPaidOrder = vi.fn().mockResolvedValue(order)
    const create = vi.fn()
    const orderRepo = { createPaidOrder, create } as unknown as IOrderRepository

    const createTransaction = vi.fn()
    const paymentService = { createTransaction } as unknown as IPaymentService

    const result = await new CreateOrder(orderRepo, productRepo, paymentService).execute({
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddress: SHIPPING,
      buyer: { idType: 'CC', idNumber: '1000123456' },
      paymentProvider: 'COD',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.order.status).toBe('PAID')
      expect(result.value.payment).toBeNull()
    }
    expect(createPaidOrder).toHaveBeenCalledWith(expect.objectContaining({
      total: product.price * 2,
      paymentProvider: 'COD',
    }))
    expect(create).not.toHaveBeenCalled()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('retorna err(VALIDATION_ERROR) cuando el producto está inactivo', async () => {
    const product = makeProduct({ isActive: false })

    const productRepo = {
      findById: vi.fn().mockResolvedValue(product),
    } as unknown as IProductRepository

    const result = await new CreateOrder(
      {} as IOrderRepository,
      productRepo,
      {} as IPaymentService,
    ).execute({
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      shippingAddress: SHIPPING,
      buyer: { idType: 'CC', idNumber: '1000123456' },
      paymentProvider: 'WOMPI',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR')
  })
})
