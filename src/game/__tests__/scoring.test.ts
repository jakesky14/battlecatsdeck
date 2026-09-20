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
