import { describe, expect, it } from 'vitest'
import type { Card } from '../cards'
import { applySpectral } from '../spectral'
import { createInitialRunState, startRound, chooseMode, type RunState } from '../runState'
import type { OwnedCat } from '../cats/types'

const low = () => 0

function c(rank: Card['rank'], suit: Card['suit'], id?: string): Card {
  return { id: id ?? `${suit}-${rank}`, rank, suit }
}

function owned(defId: string, index = 0, edition?: OwnedCat['edition']): OwnedCat {
  return { instanceId: `${defId}-inst-${index}`, defId, disabledThisRound: false, edition }
}

/** A run in the 'playing' phase with a controlled hand, for targeting tests. */
function playingStateWithHand(hand: Card[]): RunState {
  const base = chooseMode(createInitialRunState(), 'enemy')
  const started = startRound(base)
  return { ...started, hand, drawPile: [], selectedIds: [] }
}

describe('applySpectral', () => {
  it('Familiar destroys 1 hand card and adds 3 Enhanced face cards to hand + deck', () => {
    const state = playingStateWithHand([c(3, 'hearts', 'a'), c(5, 'clubs', 'b')])
    const { state: next, message } = applySpectral('familiar', state, [], low)
    expect(next.removedCardIds).toHaveLength(1)
    expect(next.extraCards).toHaveLength(3)
    expect(next.extraCards.every((card) => [11, 12, 13].includes(card.rank))).toBe(true)
    expect(next.extraCards.every((card) => !!card.enhancement)).toBe(true)
    expect(message).toContain('Familiar')
  })

  it('Grim adds 2 Enhanced Aces', () => {
    const state = playingStateWithHand([c(3, 'hearts', 'a')])
    const { state: next } = applySpectral('grim', state, [], low)
    expect(next.extraCards).toHaveLength(2)
    expect(next.extraCards.every((card) => card.rank === 14)).toBe(true)
  })

  it('Incantation adds 4 Enhanced numbered cards', () => {
    const state = playingStateWithHand([c(3, 'hearts', 'a')])
    const { state: next } = applySpectral('incantation', state, [], low)
    expect(next.extraCards).toHaveLength(4)
    expect(next.extraCards.every((card) => card.rank >= 2 && card.rank <= 10)).toBe(true)
  })

  it('Talisman adds a Gold Seal to the selected card', () => {
    const state = playingStateWithHand([c(5, 'hearts', 'target')])
    const { state: next } = applySpectral('talisman', state, ['target'])
    expect(next.hand[0].seals).toEqual(['gold'])
    expect(next.cardOverrides['target'].seals).toEqual(['gold'])
  })

  it('seals cap at 2, keeping the most recent', () => {
    const state = playingStateWithHand([{ ...c(5, 'hearts', 'target'), seals: ['gold', 'red'] }])
    const { state: next } = applySpectral('medium', state, ['target'])
    expect(next.hand[0].seals).toHaveLength(2)
    expect(next.hand[0].seals).toContain('purple')
  })

  it('Aura adds a random edition to the selected card', () => {
    const state = playingStateWithHand([c(5, 'hearts', 'target')])
    const { state: next } = applySpectral('aura', state, ['target'], low)
    expect(['foil', 'holographic', 'polychrome']).toContain(next.hand[0].edition)
  })

  it('Wraith creates a random Rare Cat and sets money to $0', () => {
    const state = { ...createInitialRunState(), money: 50 }
    const { state: next, message } = applySpectral('wraith', state, [], low)
    expect(next.money).toBe(0)
    expect(next.ownedCats).toHaveLength(1)
    expect(message).toContain('Wraith')
  })

  it('Sigil converts the whole hand to one suit', () => {
    const state = playingStateWithHand([c(3, 'hearts'), c(9, 'clubs')])
    const { state: next } = applySpectral('sigil', state, [], low)
    expect(next.hand.every((card) => card.suit === next.hand[0].suit)).toBe(true)
  })

  it('Ouija converts the whole hand to one rank and reduces hand size by 1', () => {
    const state = playingStateWithHand([c(3, 'hearts'), c(9, 'clubs')])
    const { state: next } = applySpectral('ouija', state, [], low)
    expect(next.hand.every((card) => card.rank === next.hand[0].rank)).toBe(true)
    expect(next.bonusHandSize).toBe(-1)
  })

  it('Ectoplasm makes a random Cat Negative and reduces hand size by 1', () => {
    const state = { ...createInitialRunState(), ownedCats: [owned('cat')] }
    const { state: next } = applySpectral('ectoplasm', state, [], low)
    expect(next.ownedCats[0].edition).toBe('negative')
    expect(next.bonusHandSize).toBe(-1)
  })

  it('Immolate destroys up to 5 hand cards and gives +$20', () => {
    const hand = Array.from({ length: 3 }, (_, i) => c(2, 'hearts', `c${i}`))
    const state = { ...playingStateWithHand(hand), money: 10 }
    const { state: next } = applySpectral('immolate', state, [], low)
    expect(next.hand).toHaveLength(0)
    expect(next.removedCardIds).toHaveLength(3)
    expect(next.money).toBe(30)
  })

  it('Ankh copies a random Cat and destroys all others', () => {
    const state = { ...createInitialRunState(), ownedCats: [owned('cat'), owned('tank_cat', 1)] }
    const { state: next, message } = applySpectral('ankh', state, [], low)
    expect(next.ownedCats).toHaveLength(1)
    expect(message).toContain('Ankh')
  })

  it('Hex makes a random Cat Polychrome and destroys all others', () => {
    const state = { ...createInitialRunState(), ownedCats: [owned('cat'), owned('tank_cat', 1)] }
    const { state: next } = applySpectral('hex', state, [], low)
    expect(next.ownedCats).toHaveLength(1)
    expect(next.ownedCats[0].edition).toBe('polychrome')
  })

  it('Cryptid creates 2 copies of the selected card', () => {
    const state = playingStateWithHand([c(7, 'spades', 'target')])
    const { state: next } = applySpectral('cryptid', state, ['target'], low)
    expect(next.extraCards).toHaveLength(2)
    expect(next.extraCards.every((card) => card.rank === 7 && card.suit === 'spades')).toBe(true)
  })

  it('The Soul creates a Legendary Cat if there is room', () => {
    const state = createInitialRunState()
    const { state: next, message } = applySpectral('soul', state, [], low)
    expect(next.ownedCats).toHaveLength(1)
    expect(message).toContain('Soul')
  })

  it('Black Hole levels up every poker hand by 1', () => {
    const state = createInitialRunState()
    const { state: next } = applySpectral('black_hole', state, [], low)
    expect(Object.values(next.handLevels).every((lvl) => lvl === 2)).toBe(true)
  })
})
