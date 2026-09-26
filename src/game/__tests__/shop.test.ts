import { describe, expect, it } from 'vitest'
import { generateShopSlots, rerollCost, type ShopGenContext } from '../shop'

const low = () => 0

function baseCtx(overrides: Partial<ShopGenContext> = {}): ShopGenContext {
  return { excludeCatIds: [], ownedVouchers: [], forceBuffoonPack: false, ...overrides }
}

describe('generateShopSlots', () => {
  it('generates 2 card slots + 2 pack slots by default', () => {
    const slots = generateShopSlots(baseCtx(), low)
    const cardSlots = slots.filter((s) => s.kind !== 'pack')
    const packSlots = slots.filter((s) => s.kind === 'pack')
    expect(cardSlots).toHaveLength(2)
    expect(packSlots).toHaveLength(2)
  })

  it('Overstock adds a 3rd card slot', () => {
    const slots = generateShopSlots(baseCtx({ ownedVouchers: ['overstock'] }), low)
    const cardSlots = slots.filter((s) => s.kind !== 'pack')
    expect(cardSlots).toHaveLength(3)
  })

  it('forces the first pack slot to a Normal Buffoon Pack on the first shop', () => {
    const slots = generateShopSlots(baseCtx({ forceBuffoonPack: true }), low)
    const packSlots = slots.filter((s) => s.kind === 'pack')
    expect(packSlots[0].packCategory).toBe('buffoon')
    expect(packSlots[0].packSize).toBe('normal')
  })

  it('Clearance Sale takes 25% off every card/pack slot', () => {
    const normal = generateShopSlots(baseCtx(), low)
    const discounted = generateShopSlots(baseCtx({ ownedVouchers: ['clearance_sale'] }), low)
    for (let i = 0; i < normal.length; i++) {
      expect(discounted[i].cost).toBe(Math.floor(normal[i].cost * 0.75))
    }
  })

  it('Magic Trick makes a Playing Card slot reachable (near the top of its weighted share)', () => {
    const nearTop = () => 0.995 // Joker/Tarot/Planet/Playing Card in that order — this lands in Playing Card's bucket
    const withTrick = generateShopSlots(baseCtx({ ownedVouchers: ['magic_trick'] }), nearTop)
    expect(withTrick.some((s) => s.kind === 'playing_card')).toBe(true)

    const withoutTrick = generateShopSlots(baseCtx(), nearTop)
    expect(withoutTrick.some((s) => s.kind === 'playing_card')).toBe(false)
  })
})

describe('rerollCost', () => {
  it('increases by $1 per reroll already used this shop', () => {
    expect(rerollCost(0, [])).toBe(2)
    expect(rerollCost(1, [])).toBe(3)
  })

  it('Reroll Surplus takes $2 off, floored at $0', () => {
    expect(rerollCost(0, ['reroll_surplus'])).toBe(0)
    expect(rerollCost(3, ['reroll_surplus'])).toBe(3)
  })
})
