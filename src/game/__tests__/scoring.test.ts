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
})
