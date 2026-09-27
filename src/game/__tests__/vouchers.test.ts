import { describe, expect, it } from 'vitest'
import {
  applyClearanceSale,
  createInitialLifetimeProgress,
  editionTier,
  effectiveAnte,
  interestCap,
  isVoucherEligible,
  merchantMultiplier,
  rerollDiscount,
  shopCardSlotCount,
  shopDiscountRate,
  UPGRADE_OF,
  VOUCHERS,
  voucherDef,
  type UnlockContext,
} from '../vouchers'

function ctx(overrides: Partial<UnlockContext> = {}): UnlockContext {
  return {
    lifetime: createInitialLifetimeProgress(),
    ownedCats: [],
    vouchersRedeemedThisRun: 0,
    ...overrides,
  }
}

describe('vouchers', () => {
  it('there are 32 vouchers (16 base + 16 upgrades), each with a unique id', () => {
    expect(VOUCHERS).toHaveLength(32)
    expect(new Set(VOUCHERS.map((v) => v.id)).size).toBe(32)
  })

  it('every base voucher has exactly one upgrade, and every upgrade points back to a real base', () => {
    const upgrades = VOUCHERS.filter((v) => v.upgradeOf)
    expect(upgrades).toHaveLength(16)
    for (const upgrade of upgrades) {
      expect(() => voucherDef(upgrade.upgradeOf!)).not.toThrow()
      expect(UPGRADE_OF[upgrade.upgradeOf!]).toBe(upgrade.id)
    }
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

  it('Hieroglyph and Petroglyph stack their Ante offsets', () => {
    expect(effectiveAnte(5, ['hieroglyph', 'petroglyph'])).toBe(3)
  })
})

describe('stacking rules: +N effects stack, rate/cap effects replace', () => {
  it('Overstock + Overstock Plus stack to +2 card slots', () => {
    expect(shopCardSlotCount([])).toBe(2)
    expect(shopCardSlotCount(['overstock'])).toBe(3)
    expect(shopCardSlotCount(['overstock', 'overstock_plus'])).toBe(4)
  })

  it("Liquidation's 50% replaces Clearance Sale's 25% rather than stacking", () => {
    expect(shopDiscountRate([])).toBe(0)
    expect(shopDiscountRate(['clearance_sale'])).toBe(0.25)
    expect(shopDiscountRate(['clearance_sale', 'liquidation'])).toBe(0.5)
  })

  it("Glow Up's tier replaces Hone's rather than stacking", () => {
    expect(editionTier([])).toBe(0)
    expect(editionTier(['hone'])).toBe(1)
    expect(editionTier(['hone', 'glow_up'])).toBe(2)
  })

  it("Tarot Tycoon's 4x replaces Tarot Merchant's 2x rather than stacking", () => {
    expect(merchantMultiplier([], 'tarot')).toBe(1)
    expect(merchantMultiplier(['tarot_merchant'], 'tarot')).toBe(2)
    expect(merchantMultiplier(['tarot_merchant', 'tarot_tycoon'], 'tarot')).toBe(4)
  })

  it('Reroll Surplus + Reroll Glut stack to $4 off', () => {
    expect(rerollDiscount(['reroll_surplus'])).toBe(2)
    expect(rerollDiscount(['reroll_surplus', 'reroll_glut'])).toBe(4)
  })
})

describe('isVoucherEligible', () => {
  it('base vouchers are always eligible if not owned', () => {
    expect(isVoucherEligible('grabber', [], ctx())).toBe(true)
    expect(isVoucherEligible('grabber', ['grabber'], ctx())).toBe(false)
  })

  it("an upgrade never appears until its base voucher is owned, even if its requirement is met", () => {
    const metRequirement = ctx({ lifetime: { ...createInitialLifetimeProgress(), totalSpentAtShop: 3000 } })
    expect(isVoucherEligible('overstock_plus', [], metRequirement)).toBe(false)
    expect(isVoucherEligible('overstock_plus', ['overstock'], metRequirement)).toBe(true)
  })

  it("an upgrade doesn't appear with its base owned until its requirement is met", () => {
    expect(isVoucherEligible('overstock_plus', ['overstock'], ctx())).toBe(false)
  })

  it("Liquidation reads vouchersRedeemedThisRun (an 'in one run' requirement)", () => {
    expect(isVoucherEligible('liquidation', ['clearance_sale'], ctx({ vouchersRedeemedThisRun: 9 }))).toBe(false)
    expect(isVoucherEligible('liquidation', ['clearance_sale'], ctx({ vouchersRedeemedThisRun: 10 }))).toBe(true)
  })

  it("Glow Up reads live ownedCats (an 'in one run' requirement), not a lifetime counter", () => {
    const fiveEditioned = Array.from({ length: 5 }, (_, i) => ({
      instanceId: `c${i}`,
      defId: 'cat',
      disabledThisRound: false,
      edition: 'foil' as const,
    }))
    expect(isVoucherEligible('glow_up', ['hone'], ctx({ ownedCats: fiveEditioned.slice(0, 4) }))).toBe(false)
    expect(isVoucherEligible('glow_up', ['hone'], ctx({ ownedCats: fiveEditioned }))).toBe(true)
  })

  it('Petroglyph and Retcon are unreachable under this game\'s current caps', () => {
    const maxedOut = createInitialLifetimeProgress()
    maxedOut.maxAnteReached = 8 // MAX_ANTE
    maxedOut.discoveredBlindIds = ['small', 'big', ...Array.from({ length: 8 }, (_, i) => `boss-${i}`)] // all 10 possible
    expect(isVoucherEligible('petroglyph', ['hieroglyph'], ctx({ lifetime: maxedOut }))).toBe(false)
    expect(isVoucherEligible('retcon', ['directors_cut'], ctx({ lifetime: maxedOut }))).toBe(false)
  })
})
