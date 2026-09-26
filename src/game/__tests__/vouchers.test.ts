import { describe, expect, it } from 'vitest'
import {
  applyClearanceSale,
  effectiveAnte,
  interestCap,
  rerollDiscount,
  shopCardSlotCount,
  VOUCHERS,
} from '../vouchers'

describe('vouchers', () => {
  it('there are 16 vouchers, each with a unique id', () => {
    expect(VOUCHERS).toHaveLength(16)
    expect(new Set(VOUCHERS.map((v) => v.id)).size).toBe(16)
  })

  it('Overstock adds 1 card slot', () => {
    expect(shopCardSlotCount([])).toBe(2)
    expect(shopCardSlotCount(['overstock'])).toBe(3)
  })

  it('Clearance Sale takes 25% off, rounded down', () => {
    expect(applyClearanceSale(7, ['clearance_sale'])).toBe(5) // 5.25 -> 5
    expect(applyClearanceSale(7, [])).toBe(7)
  })

  it('Seed Money raises the interest cap to $10', () => {
    expect(interestCap([])).toBe(5)
    expect(interestCap(['seed_money'])).toBe(10)
  })

  it('Reroll Surplus discounts rerolls by $2', () => {
    expect(rerollDiscount([])).toBe(0)
    expect(rerollDiscount(['reroll_surplus'])).toBe(2)
  })

  it('Hieroglyph shifts the effective Ante back by 1, floored at 1', () => {
    expect(effectiveAnte(3, ['hieroglyph'])).toBe(2)
    expect(effectiveAnte(1, ['hieroglyph'])).toBe(1)
    expect(effectiveAnte(3, [])).toBe(3)
  })
})
