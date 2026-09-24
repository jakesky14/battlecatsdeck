import { describe, expect, it } from 'vitest'
import type { Card } from '../cards'
import { computeScore } from '../scoring'
import type { OwnedCat } from '../cats/types'

function c(rank: Card['rank'], suit: Card['suit']): Card {
  return { id: `${suit}-${rank}-${Math.random()}`, rank, suit }
}

function owned(defId: string): OwnedCat {
  return { instanceId: `${defId}-inst`, defId, disabledThisRound: false }
}

const baseOptions = {
  discardsUsedThisRound: 0,
  handsPlayedThisRound: 0,
  ante: 1,
  blind: 'small' as const,
  catsDisabled: false,
}

describe('computeScore', () => {
  it('scores a pair with no cats using base hand math', () => {
    const hand = [c(7, 'hearts'), c(7, 'clubs'), c(2, 'spades')]
    const result = computeScore(hand, [], baseOptions)
    // base pair: 10 chips + 2 mult, scoring cards are the two 7s (chip value 7 each)
    expect(result.chips).toBe(10 + 7 + 7)
    expect(result.mult).toBe(2)
    expect(result.total).toBe((10 + 14) * 2)
  })

  it('applies a cat effect that boosts chips on a pair', () => {
    const hand = [c(7, 'hearts'), c(7, 'clubs'), c(2, 'spades')]
    const result = computeScore(hand, [owned('tank_cat')], baseOptions)
    expect(result.chips).toBe(10 + 14 + 20)
    expect(result.total).toBe((10 + 14 + 20) * 2)
  })

  it('suppresses cat effects when catsDisabled is true', () => {
    const hand = [c(7, 'hearts'), c(7, 'clubs'), c(2, 'spades')]
    const result = computeScore(hand, [owned('tank_cat')], { ...baseOptions, catsDisabled: true })
    expect(result.chips).toBe(10 + 14)
  })

  it('applies a multiplicative cat effect on top of additive ones', () => {
    const hand = [c(9, 'hearts'), c(9, 'clubs'), c(9, 'spades'), c(9, 'diamonds')]
    const result = computeScore(hand, [owned('titan_cat')], baseOptions)
    // base four_of_a_kind: 60 chips, 7 mult -> titan cat: mult *= 1.5
    expect(result.mult).toBe(7 * 1.5)
  })

  it('zeroes chips and cat triggers for cards of a boss-banned suit', () => {
    const hand = [c(7, 'hearts'), c(7, 'spades'), c(2, 'clubs')]
    const result = computeScore(hand, [owned('bird_cat')], { ...baseOptions, bannedSuit: 'spades' })
    // pair of 7s: base 10 chips, but the spade 7 contributes 0 chips and no Bird Cat (+3/spade) trigger
    expect(result.chips).toBe(10 + 7)
    expect(result.mult).toBe(2)
  })

  it('uses leveled-up hand base values when handLevels is provided', () => {
    const hand = [c(4, 'hearts'), c(4, 'clubs'), c(2, 'spades')]
    const base = computeScore(hand, [], baseOptions)
    const leveled = computeScore(hand, [], {
      ...baseOptions,
      handLevels: { ...defaultLevels(), pair: 3 },
    })
    // pair levelChips=15, levelMult=1 per level above 1; level 3 = +2 levels
    expect(leveled.chips).toBe(base.chips + 15 * 2)
    expect(leveled.mult).toBe(base.mult + 1 * 2)
  })

  describe('enhancements', () => {
    it('Bonus Card adds +30 chips when scored', () => {
      const card: Card = { ...c(7, 'hearts'), enhancement: 'bonus' }
      expect(computeScore([card], [], baseOptions).chips).toBe(5 + 7 + 30)
    })

    it('Mult Card adds +4 mult when scored', () => {
      const card: Card = { ...c(7, 'hearts'), enhancement: 'mult' }
      expect(computeScore([card], [], baseOptions).mult).toBe(1 + 4)
    })

    it('Stone Card adds +50 chips and is excluded from hand-shape detection', () => {
      const pair = [c(7, 'hearts'), c(7, 'clubs')]
      const stone: Card = { ...c(2, 'spades'), enhancement: 'stone' }
      const result = computeScore([...pair, stone], [], baseOptions)
      expect(result.handType).toBe('pair')
      expect(result.scoringCards).toHaveLength(3)
      expect(result.chips).toBe(10 + 7 + 7 + 50)
      expect(result.mult).toBe(2)
    })

    it('Glass Card doubles mult and can destroy itself after scoring', () => {
      const card: Card = { ...c(7, 'hearts'), enhancement: 'glass' }
      const destroyed = computeScore([card], [], { ...baseOptions, rng: () => 0 })
      expect(destroyed.mult).toBe(1 * 2)
      expect(destroyed.destroyedCardIds).toContain(card.id)

      const safe = computeScore([card], [], { ...baseOptions, rng: () => 0.99 })
      expect(safe.destroyedCardIds).toHaveLength(0)
    })

    it('Steel Card multiplies mult while held, not played', () => {
      const played = [c(7, 'hearts')]
      const steelHeld: Card = { ...c(9, 'clubs'), enhancement: 'steel' }
      const withSteel = computeScore(played, [], { ...baseOptions, heldCards: [steelHeld] })
      const without = computeScore(played, [], baseOptions)
      expect(withSteel.mult).toBeCloseTo(without.mult * 1.5)
    })

    it('Lucky Card independently rolls +20 mult and +$20 money', () => {
      const card: Card = { ...c(7, 'hearts'), enhancement: 'lucky' }
      const bothHit = computeScore([card], [], { ...baseOptions, rng: () => 0 })
      expect(bothHit.mult).toBe(1 + 20)
      expect(bothHit.moneyGained).toBe(20)

      const bothMiss = computeScore([card], [], { ...baseOptions, rng: () => 0.99 })
      expect(bothMiss.mult).toBe(1)
      expect(bothMiss.moneyGained).toBe(0)
    })
  })

  describe('seals', () => {
    it('Gold Seal earns $3 when the card is played and scores', () => {
      const card: Card = { ...c(7, 'hearts'), seals: ['gold'] }
      expect(computeScore([card], [], baseOptions).moneyGained).toBe(3)
    })

    it('Red Seal retriggers the card’s full scoring contribution once more', () => {
      const withoutSeal: Card = { ...c(7, 'hearts'), enhancement: 'bonus' }
      const withSeal: Card = { ...withoutSeal, id: 'other', seals: ['red'] }
      const once = computeScore([withoutSeal], [], baseOptions)
      const twice = computeScore([withSeal], [], baseOptions)
      const perTrigger = 7 + 30
      expect(twice.chips).toBe(once.chips + perTrigger)
    })

    it('Red Seal also doubles a Cat’s per-card trigger', () => {
      const card: Card = { ...c(13, 'spades'), seals: ['red'] }
      const result = computeScore([card], [owned('valkyrie_cat')], baseOptions)
      expect(result.mult).toBe(1 + 5 + 5)
    })
  })

  describe('editions', () => {
    it('card editions apply their bonus when scored', () => {
      const foil: Card = { ...c(7, 'hearts'), edition: 'foil' }
      const holo: Card = { ...c(7, 'hearts'), edition: 'holographic' }
      const poly: Card = { ...c(7, 'hearts'), edition: 'polychrome' }
      expect(computeScore([foil], [], baseOptions).chips).toBe(5 + 7 + 50)
      expect(computeScore([holo], [], baseOptions).mult).toBe(1 + 10)
      expect(computeScore([poly], [], baseOptions).mult).toBeCloseTo(1 * 1.5)
    })

    it('cat editions apply their bonus every hand played', () => {
      const hand = [c(7, 'hearts')]
      const foilCat: OwnedCat = { ...owned('cat'), edition: 'foil' }
      const holoCat: OwnedCat = { ...owned('cat'), edition: 'holographic' }
      const polyCat: OwnedCat = { ...owned('cat'), edition: 'polychrome' }
      expect(computeScore(hand, [foilCat], baseOptions).chips).toBe(5 + 7 + 50)
      expect(computeScore(hand, [holoCat], baseOptions).mult).toBe(1 + 10)
      expect(computeScore(hand, [polyCat], baseOptions).mult).toBeCloseTo(1.5)
    })

    it('catsDisabled suppresses cat editions too', () => {
      const hand = [c(7, 'hearts')]
      const foilCat: OwnedCat = { ...owned('cat'), edition: 'foil' }
      const result = computeScore(hand, [foilCat], { ...baseOptions, catsDisabled: true })
      expect(result.chips).toBe(5 + 7)
    })
  })
})

function defaultLevels() {
  return {
    high_card: 1,
    pair: 1,
    two_pair: 1,
    three_of_a_kind: 1,
    straight: 1,
    flush: 1,
    full_house: 1,
    four_of_a_kind: 1,
    straight_flush: 1,
    five_of_a_kind: 1,
    flush_house: 1,
    flush_five: 1,
  }
}
