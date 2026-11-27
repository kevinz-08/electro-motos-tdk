import { describe, it, expect } from 'vitest'
import { codBalanceDue } from '@/domain/entities/Order'

describe('codBalanceDue', () => {
  it('descuenta el anticipo del total', () => {
    expect(codBalanceDue({ total: 5000000, codDepositAmount: 1500000 })).toBe(3500000)
  })

  it('sin anticipo el saldo es el total', () => {
    expect(codBalanceDue({ total: 5000000 })).toBe(5000000)
    expect(codBalanceDue({ total: 5000000, codDepositAmount: 0 })).toBe(5000000)
  })

  it('suma el flete COD que se paga a la transportadora (caso estacionarias: 65.000 + 12.100 − 15.000)', () => {
    expect(codBalanceDue({ total: 6500000, codShippingDue: 1210000, codDepositAmount: 1500000 })).toBe(6210000)
  })

  it('anticipo que cubre producto + flete deja saldo 0', () => {
    expect(codBalanceDue({ total: 700000, codShippingDue: 1390000, codDepositAmount: 2090000 })).toBe(0)
  })

  it('sin anticipo el saldo es producto + flete', () => {
    expect(codBalanceDue({ total: 700000, codShippingDue: 1390000 })).toBe(2090000)
  })

  it('nunca es negativo', () => {
    expect(codBalanceDue({ total: 1000000, codDepositAmount: 1500000 })).toBe(0)
  })
})
