import { describe, expect, it } from 'vitest'
import {
  buyShopSlot,
  buyVoucher,
  choosePackOption,
  chooseMode,
  createInitialRunState,
  leaveShop,
  openPackSlot,
  playHand,
  skipPackOpening,
  startRound,
  toggleSelect,
  type RunState,
} from '../runState'

/** A splittable PRNG so every call site gets independent, deterministic
 *  pseudo-randomness across a long simulated playthrough. */
function makeRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/** Buys every non-pack card slot, opens every pack slot and picks through
 *  all of its options (targeting the first N held-hand cards if needed),
 *  and buys the voucher if one's offered — exercising every shop code path. */
function clearOutShop(state: RunState, rng: () => number): RunState {
  let next = { ...state, money: 1_000_000 }

  for (const slot of [...next.shopOffers]) {
    if (slot.kind === 'pack') continue
    if (!next.shopOffers.some((s) => s.id === slot.id)) continue
    next = buyShopSlot(next, slot.id, rng)
  }

  for (const slot of next.shopOffers.filter((s) => s.kind === 'pack')) {
    next = openPackSlot(next, slot.id, rng)
    let guard = 0
    while (next.packOpening && guard < 20) {
      guard += 1
      const entry = next.packOpening.options[0]
      if (!entry) break
      const targetIds = next.hand.slice(0, 2).map((c) => c.id)
      // Try the largest plausible target count first, then fall back to none —
      // choosePackOption silently no-ops on a bad count, so this can't corrupt state.
      const before = next.packOpening
      next = choosePackOption(next, entry.optionId, targetIds, rng)
      if (next.packOpening === before) {
        next = choosePackOption(next, entry.optionId, targetIds.slice(0, 1), rng)
      }
      if (next.packOpening === before) {
        next = choosePackOption(next, entry.optionId, [], rng)
      }
      if (next.packOpening === before) {
        // Truly can't take this one (e.g. no Cat room left) — a real player would click Done.
        next = skipPackOpening(next)
      }
    }
  }

  if (next.voucherOffer) {
    next = buyVoucher(next)
  }

  return next
}

function forceWinRound(state: RunState): RunState {
  let next = { ...state, target: 0 }
  const cardId = next.hand[0].id
  next = toggleSelect(next, cardId)
  next = playHand(next)
  return next
}

describe('full playthrough integration', () => {
  it('plays several Antes, clearing out the shop every time, without crashing or going negative on money', () => {
    const rng = makeRng(42)
    let state = chooseMode(createInitialRunState(), 'enemy')

    for (let round = 0; round < 12 && state.phase !== 'victory' && state.phase !== 'game-over'; round++) {
      state = startRound(state)
      expect(state.phase).toBe('playing')
      state = forceWinRound(state)
      expect(state.phase).toBe('shop')
      state = clearOutShop(state, rng)
      expect(state.money).toBeGreaterThanOrEqual(0)
      expect(state.packOpening).toBeNull()

      state = leaveShop(state)
    }

    expect(['victory', 'blind-select']).toContain(state.phase)
  })
})
