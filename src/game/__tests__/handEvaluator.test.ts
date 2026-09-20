import { describe, expect, it } from 'vitest'
import type { Card } from '../cards'
import { evaluateHand } from '../handEvaluator'

function c(rank: Card['rank'], suit: Card['suit']): Card {
  return { id: `${suit}-${rank}-${Math.random()}`, rank, suit }
}

describe('evaluateHand', () => {
  it('detects high card', () => {
    const hand = [c(2, 'hearts'), c(5, 'clubs'), c(9, 'spades'), c(11, 'diamonds'), c(13, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('high_card')
    expect(result.scoringCards).toHaveLength(1)
    expect(result.scoringCards[0].rank).toBe(13)
  })

  it('detects a pair and scores only the pair', () => {
    const hand = [c(7, 'hearts'), c(7, 'clubs'), c(2, 'spades'), c(9, 'diamonds'), c(11, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('pair')
    expect(result.scoringCards).toHaveLength(2)
    expect(result.scoringCards.every((card) => card.rank === 7)).toBe(true)
  })

  it('detects two pair', () => {
    const hand = [c(7, 'hearts'), c(7, 'clubs'), c(4, 'spades'), c(4, 'diamonds'), c(11, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('two_pair')
    expect(result.scoringCards).toHaveLength(4)
  })

  it('detects three of a kind', () => {
    const hand = [c(9, 'hearts'), c(9, 'clubs'), c(9, 'spades'), c(4, 'diamonds'), c(11, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('three_of_a_kind')
    expect(result.scoringCards).toHaveLength(3)
  })

  it('detects a straight, including ace-low', () => {
    const normal = [c(4, 'hearts'), c(5, 'clubs'), c(6, 'spades'), c(7, 'diamonds'), c(8, 'hearts')]
    expect(evaluateHand(normal).handType).toBe('straight')

    const aceLow = [c(14, 'hearts'), c(2, 'clubs'), c(3, 'spades'), c(4, 'diamonds'), c(5, 'hearts')]
    expect(evaluateHand(aceLow).handType).toBe('straight')
  })

  it('does not call a non-consecutive run a straight', () => {
    const hand = [c(2, 'hearts'), c(3, 'clubs'), c(4, 'spades'), c(5, 'diamonds'), c(7, 'hearts')]
    expect(evaluateHand(hand).handType).not.toBe('straight')
  })

  it('detects a flush', () => {
    const hand = [c(2, 'hearts'), c(5, 'hearts'), c(9, 'hearts'), c(11, 'hearts'), c(13, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('flush')
    expect(result.scoringCards).toHaveLength(5)
  })

  it('detects a full house', () => {
    const hand = [c(9, 'hearts'), c(9, 'clubs'), c(9, 'spades'), c(4, 'diamonds'), c(4, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('full_house')
    expect(result.scoringCards).toHaveLength(5)
  })

  it('detects four of a kind', () => {
    const hand = [c(9, 'hearts'), c(9, 'clubs'), c(9, 'spades'), c(9, 'diamonds'), c(4, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('four_of_a_kind')
    expect(result.scoringCards).toHaveLength(4)
  })

  it('detects a straight flush', () => {
    const hand = [c(4, 'hearts'), c(5, 'hearts'), c(6, 'hearts'), c(7, 'hearts'), c(8, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('straight_flush')
    expect(result.scoringCards).toHaveLength(5)
  })

  it('ranks four of a kind above a full house', () => {
    // sanity check that group sorting favors the quad, not the trip
    const hand = [c(9, 'hearts'), c(9, 'clubs'), c(9, 'spades'), c(9, 'diamonds'), c(4, 'hearts')]
    expect(evaluateHand(hand).handType).toBe('four_of_a_kind')
  })

  // These hand types need duplicate rank/suit cards a standard 52-card deck
  // can't deal on its own (only reachable via future card-duplication effects),
  // but the evaluator should still recognize them correctly when it happens.
  it('detects five of a kind (duplicate ranks required)', () => {
    const hand = [c(9, 'hearts'), c(9, 'clubs'), c(9, 'spades'), c(9, 'diamonds'), c(9, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('five_of_a_kind')
    expect(result.scoringCards).toHaveLength(5)
  })

  it('detects flush house (full house all one suit)', () => {
    const hand = [c(9, 'hearts'), c(9, 'hearts'), c(9, 'hearts'), c(4, 'hearts'), c(4, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('flush_house')
  })

  it('detects flush five (five of a kind all one suit)', () => {
    const hand = [c(9, 'hearts'), c(9, 'hearts'), c(9, 'hearts'), c(9, 'hearts'), c(9, 'hearts')]
    const result = evaluateHand(hand)
    expect(result.handType).toBe('flush_five')
  })
})
