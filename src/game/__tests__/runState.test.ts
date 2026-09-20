import { describe, expect, it } from 'vitest'
import {
  createInitialRunState,
  discardSelected,
  playHand,
  startRound,
  toggleSelect,
} from '../runState'
import type { RunState } from '../runState'

function selectAll(state: RunState, ids: string[]): RunState {
  return ids.reduce((s, id) => toggleSelect(s, id), state)
}

describe('run state machine', () => {
  it('starts a round with a full hand and default resources', () => {
    const state = startRound(createInitialRunState())
    expect(state.phase).toBe('playing')
    expect(state.hand).toHaveLength(8)
    expect(state.handsRemaining).toBe(4)
    expect(state.discardsRemaining).toBe(3)
  })

  it('discarding replaces selected cards and consumes a discard', () => {
    let state = startRound(createInitialRunState())
    const toDiscard = state.hand.slice(0, 3).map((c) => c.id)
    state = selectAll(state, toDiscard)
    state = discardSelected(state)
    expect(state.hand).toHaveLength(8)
    expect(state.discardsRemaining).toBe(2)
    expect(state.discardsUsedThisRound).toBe(1)
    expect(state.selectedIds).toHaveLength(0)
  })

  it('winning a small blind round moves to the shop and awards money', () => {
    let state = startRound(createInitialRunState())
    state = { ...state, target: 0 } // force an immediate win on first play
    const cardId = state.hand[0].id
    state = toggleSelect(state, cardId)
    state = playHand(state)
    expect(state.phase).toBe('shop')
    expect(state.blind).toBe('big')
    expect(state.money).toBeGreaterThan(4)
  })

  it('losing all hands without reaching target ends the run', () => {
    let state = startRound(createInitialRunState())
    state = { ...state, target: 999999 }
    for (let i = 0; i < 4; i++) {
      const cardId = state.hand[0].id
      state = toggleSelect(state, cardId)
      state = playHand(state)
    }
    expect(state.phase).toBe('game-over')
    expect(state.handsRemaining).toBe(0)
  })
})
