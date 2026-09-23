import { describe, expect, it } from 'vitest'
import type { Card } from '../cards'
import { applyTarot } from '../tarot'
import { createInitialRunState, startRound, chooseMode, type RunState } from '../runState'
import { MAX_CONSUMABLE_SLOTS, type ConsumableItem } from '../consumables'
import type { OwnedCat } from '../cats/types'

const low = () => 0

function c(rank: Card['rank'], suit: Card['suit'], id?: string): Card {
  return { id: id ?? `${suit}-${rank}`, rank, suit }
}

function consumable(cardId: string, index = 0): ConsumableItem {
  return { instanceId: `${cardId}-inst-${index}`, kind: 'tarot', cardId }
}

function owned(defId: string, index = 0): OwnedCat {
  return { instanceId: `${defId}-inst-${index}`, defId, disabledThisRound: false }
}

/** A run in the 'playing' phase with a controlled 3-card hand, for targeting tests. */
function playingStateWithHand(hand: Card[]): RunState {
  const base = chooseMode(createInitialRunState(), 'enemy')
  const started = startRound(base)
  return { ...started, hand, drawPile: [], selectedIds: [] }
}

describe('applyTarot', () => {
  it('Strength increases rank and records a permanent override', () => {
    const state = playingStateWithHand([c(3, 'hearts'), c(10, 'clubs'), c(14, 'spades')])
    const { state: next } = applyTarot('strength', state, [state.hand[0].id, state.hand[1].id])
    expect(next.hand[0].rank).toBe(4)
    expect(next.hand[1].rank).toBe(11) // 10 -> Jack
    expect(next.cardOverrides[state.hand[0].id]).toEqual({ rank: 4 })
  })

  it('Strength wraps Ace back to 2', () => {
    const state = playingStateWithHand([c(14, 'spades')])
    const { state: next } = applyTarot('strength', state, [state.hand[0].id])
    expect(next.hand[0].rank).toBe(2)
  })

  it('card overrides persist into the next round’s freshly dealt deck', () => {
    let state = playingStateWithHand([c(3, 'hearts', 'hearts-3')])
    const result = applyTarot('strength', state, ['hearts-3'])
    state = result.state
    // simulate the round ending and a new one starting
    state = { ...state, phase: 'blind-select' }
    state = startRound(state)
    const theCard = [...state.hand, ...state.drawPile].find((card) => card.id === 'hearts-3')
    expect(theCard?.rank).toBe(4)
  })

  it('Hanged Man destroys cards and removes them from future decks', () => {
    const state = playingStateWithHand([c(3, 'hearts', 'hearts-3'), c(9, 'clubs', 'clubs-9')])
    const { state: next } = applyTarot('hanged_man', state, ['hearts-3'])
    expect(next.hand.map((card) => card.id)).not.toContain('hearts-3')
    expect(next.removedCardIds).toContain('hearts-3')

    const reshuffled = startRound({ ...next, phase: 'blind-select' })
    const allCards = [...reshuffled.hand, ...reshuffled.drawPile]
    expect(allCards.some((card) => card.id === 'hearts-3')).toBe(false)
  })

  it('Death converts the left card into a copy of the right card', () => {
    const left = c(3, 'hearts', 'left')
    const right = c(13, 'spades', 'right')
    const state = playingStateWithHand([left, right])
    const { state: next } = applyTarot('death', state, ['left', 'right'])
    expect(next.hand[0]).toMatchObject({ id: 'left', rank: 13, suit: 'spades' })
    expect(next.hand[1]).toMatchObject({ id: 'right', rank: 13, suit: 'spades' })
  })

  it('Death converts based on hand position, not selection order', () => {
    const left = c(3, 'hearts', 'left')
    const right = c(13, 'spades', 'right')
    const state = playingStateWithHand([left, right])
    // select right before left - position in hand should still decide left/right
    const { state: next } = applyTarot('death', state, ['right', 'left'])
    expect(next.hand[0]).toMatchObject({ rank: 13, suit: 'spades' })
    expect(next.hand[1]).toMatchObject({ rank: 13, suit: 'spades' })
  })

  it('Star/Moon/Sun/World convert selected cards to the right suit', () => {
    const state = playingStateWithHand([c(5, 'hearts'), c(6, 'clubs')])
    const ids = state.hand.map((card) => card.id)
    expect(applyTarot('star', state, ids).state.hand.every((card) => card.suit === 'diamonds')).toBe(true)
    expect(applyTarot('moon', state, ids).state.hand.every((card) => card.suit === 'clubs')).toBe(true)
    expect(applyTarot('sun', state, ids).state.hand.every((card) => card.suit === 'hearts')).toBe(true)
    expect(applyTarot('world', state, ids).state.hand.every((card) => card.suit === 'spades')).toBe(true)
  })

  it('Hermit doubles money, capped at +$20', () => {
    const state = createInitialRunState()
    expect(applyTarot('hermit', { ...state, money: 5 }, []).state.money).toBe(10)
    expect(applyTarot('hermit', { ...state, money: 100 }, []).state.money).toBe(120)
  })

  it('Temperance gives total Cat sell value, capped at $50', () => {
    const state = createInitialRunState()
    const withCats = { ...state, ownedCats: [owned('awakened_bahamut_cat'), owned('metal_cat', 1)] } // sell 6 + 6 = 12
    const { state: next, message } = applyTarot('temperance', withCats, [])
    expect(next.money).toBe(state.money + 12)
    expect(message).toContain('12')
  })

  it('Judgement creates a Cat only if there is room', () => {
    const state = createInitialRunState()
    const { state: withCat } = applyTarot('judgement', state, [], low)
    expect(withCat.ownedCats).toHaveLength(1)

    const full = { ...state, ownedCats: Array.from({ length: 5 }, (_, i) => owned('cat', i)) }
    const { state: stillFull, message } = applyTarot('judgement', full, [], low)
    expect(stillFull.ownedCats).toHaveLength(5)
    expect(message).toContain('no room')
  })

  it('High Priestess levels up 2 random Planet cards instantly', () => {
    const state = createInitialRunState()
    const { state: next } = applyTarot('high_priestess', state, [], low)
    // both rolls land on the same card with a fixed low rng, so it should be level 3
    expect(next.handLevels.high_card).toBe(3)
  })

  it('Emperor creates Tarot cards only up to available room', () => {
    const state = createInitialRunState()
    const { state: next, message } = applyTarot('emperor', state, [], low)
    expect(next.consumables).toHaveLength(2)
    expect(message).toContain('Emperor')

    const oneSlotFree = { ...state, consumables: [consumable('hermit')] }
    const { state: nextOne } = applyTarot('emperor', oneSlotFree, [], low)
    expect(nextOne.consumables).toHaveLength(MAX_CONSUMABLE_SLOTS)
  })

  it('The Fool copies the last used Planet card instantly, with no message if nothing was used yet', () => {
    const state = createInitialRunState()
    expect(applyTarot('fool', state, []).message).toContain('nothing to copy')

    const afterPlanet = { ...state, lastConsumableUsed: { kind: 'planet' as const, id: 'pluto' } }
    const { state: next, message } = applyTarot('fool', afterPlanet, [])
    expect(next.handLevels.high_card).toBe(2)
    expect(message).toContain('Pluto')
  })

  it('The Fool copies the last used Tarot card into the inventory', () => {
    const state = { ...createInitialRunState(), lastConsumableUsed: { kind: 'tarot' as const, id: 'hermit' } }
    const { state: next, message } = applyTarot('fool', state, [])
    expect(next.consumables).toHaveLength(1)
    expect(next.consumables[0].cardId).toBe('hermit')
    expect(message).toContain('Fool')
  })

  it('using The Fool does not itself become "the last used" card', () => {
    const state = { ...createInitialRunState(), lastConsumableUsed: { kind: 'planet' as const, id: 'pluto' } }
    const { state: next } = applyTarot('fool', state, [])
    expect(next.lastConsumableUsed).toEqual({ kind: 'planet', id: 'pluto' })
  })

  it('non-Fool cards record themselves as the last consumable used', () => {
    const state = createInitialRunState()
    const { state: next } = applyTarot('hermit', state, [])
    expect(next.lastConsumableUsed).toEqual({ kind: 'tarot', id: 'hermit' })
  })
})
