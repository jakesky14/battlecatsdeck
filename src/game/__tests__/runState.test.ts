import { describe, expect, it } from 'vitest'
import {
  buyShopSlot,
  buyVoucher,
  chooseMode,
  choosePackOption,
  createInitialRunState,
  discardSelected,
  openPackSlot,
  playHand,
  reorderCats,
  rerollBossBlind,
  sellCat,
  sellConsumable,
  skipPackOpening,
  startRound,
  toggleSelect,
} from '../runState'
import type { RunState } from '../runState'
import type { ShopSlot } from '../shop'
import type { OwnedCat } from '../cats/types'

function selectAll(state: RunState, ids: string[]): RunState {
  return ids.reduce((s, id) => toggleSelect(s, id), state)
}

/** A fresh run past mode-select, ready to start its first blind. */
function readyState(): RunState {
  return chooseMode(createInitialRunState(), 'enemy')
}

function owned(defId: string, index = 0, edition?: OwnedCat['edition']): OwnedCat {
  return { instanceId: `${defId}-inst-${index}`, defId, disabledThisRound: false, edition }
}

describe('run state machine', () => {
  it('mode-select gates the run until a mode is chosen', () => {
    const fresh = createInitialRunState()
    expect(fresh.phase).toBe('mode-select')
    expect(startRound(fresh).phase).toBe('mode-select') // can't start before choosing

    const chosen = chooseMode(fresh, 'classic')
    expect(chosen.phase).toBe('blind-select')
    expect(chosen.mode).toBe('classic')
  })

  it('starts a round with a full hand and default resources', () => {
    const state = startRound(readyState())
    expect(state.phase).toBe('playing')
    expect(state.hand).toHaveLength(8)
    expect(state.handsRemaining).toBe(4)
    expect(state.discardsRemaining).toBe(3)
  })

  it('discarding replaces selected cards and consumes a discard', () => {
    let state = startRound(readyState())
    const toDiscard = state.hand.slice(0, 3).map((c) => c.id)
    state = selectAll(state, toDiscard)
    state = discardSelected(state)
    expect(state.hand).toHaveLength(8)
    expect(state.discardsRemaining).toBe(2)
    expect(state.discardsUsedThisRound).toBe(1)
    expect(state.selectedIds).toHaveLength(0)
  })

  it('winning a small blind round moves to the shop and awards money', () => {
    let state = startRound(readyState())
    state = { ...state, target: 0 } // force an immediate win on first play
    const cardId = state.hand[0].id
    state = toggleSelect(state, cardId)
    state = playHand(state)
    expect(state.phase).toBe('shop')
    expect(state.blind).toBe('big')
    expect(state.money).toBeGreaterThan(4)
  })

  it('losing all hands without reaching target ends the run', () => {
    let state = startRound(readyState())
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

describe('shop purchases with editions', () => {
  function shopState(overrides: Partial<RunState>): RunState {
    return { ...readyState(), phase: 'shop', money: 100, ...overrides }
  }

  it('buying a Cat with an edition applies the price delta and stores the edition', () => {
    const slot: ShopSlot = { id: 'slot1', kind: 'joker', catId: 'cat', catEdition: 'foil', cost: 5 }
    let state = shopState({ shopOffers: [slot] })
    state = buyShopSlot(state, 'slot1')
    expect(state.ownedCats[0].edition).toBe('foil')
    expect(state.money).toBe(100 - 5)
  })

  it('a Negative-edition Cat does not count toward the Cat slot limit', () => {
    const fiveNegative = Array.from({ length: 5 }, (_, i) => owned('cat', i, 'negative'))
    const slot: ShopSlot = { id: 'slot1', kind: 'joker', catId: 'tank_cat', cost: 4 }
    let state = shopState({ ownedCats: fiveNegative, shopOffers: [slot] })
    state = buyShopSlot(state, 'slot1')
    expect(state.ownedCats).toHaveLength(6)
  })

  it('a full (non-negative) Cat roster blocks the purchase', () => {
    const fiveNormal = Array.from({ length: 5 }, (_, i) => owned('cat', i))
    const slot: ShopSlot = { id: 'slot1', kind: 'joker', catId: 'tank_cat', cost: 4 }
    let state = shopState({ ownedCats: fiveNormal, shopOffers: [slot] })
    state = buyShopSlot(state, 'slot1')
    expect(state.ownedCats).toHaveLength(5)
  })
})

describe('selling', () => {
  it('selling a Cat with an edition includes the price delta', () => {
    let state = { ...readyState(), ownedCats: [owned('cat', 0, 'holographic')] }
    const before = state.money
    state = sellCat(state, 'cat-inst-0')
    expect(state.money).toBe(before + 1 + 3) // Cat sellValue $1 + Holographic delta $3
  })

  it('sells a held Tarot consumable for $1', () => {
    let state: RunState = { ...readyState(), consumables: [{ instanceId: 't1', kind: 'tarot', cardId: 'hermit' }] }
    const before = state.money
    state = sellConsumable(state, 't1')
    expect(state.money).toBe(before + 1)
    expect(state.consumables).toHaveLength(0)
  })

  it('sells a held Blue-Seal Planet consumable for $1', () => {
    let state: RunState = { ...readyState(), consumables: [{ instanceId: 'p1', kind: 'planet', cardId: 'pluto' }] }
    const before = state.money
    state = sellConsumable(state, 'p1')
    expect(state.money).toBe(before + 1)
  })
})

describe('pack opening flow', () => {
  function shopState(overrides: Partial<RunState>): RunState {
    return { ...readyState(), phase: 'shop', money: 100, ...overrides }
  }

  it('opening a pack deducts cost, removes the slot, and rolls choosable options', () => {
    const slot: ShopSlot = { id: 'pack1', kind: 'pack', packCategory: 'arcana', packSize: 'normal', cost: 4 }
    let state = shopState({ shopOffers: [slot] })
    state = openPackSlot(state, 'pack1')
    expect(state.money).toBe(96)
    expect(state.shopOffers).toHaveLength(0)
    expect(state.packOpening).not.toBeNull()
    expect(state.packOpening?.options).toHaveLength(3)
    expect(state.packOpening?.chooseRemaining).toBe(1)
  })

  it('choosing an option applies its effect and closes the pack once choices run out', () => {
    const slot: ShopSlot = { id: 'pack1', kind: 'pack', packCategory: 'celestial', packSize: 'normal', cost: 4 }
    let state = shopState({ shopOffers: [slot] })
    state = openPackSlot(state, 'pack1')
    const optionId = state.packOpening!.options[0].optionId
    state = choosePackOption(state, optionId, [])
    expect(state.packOpening).toBeNull()
    expect(state.message).toBeTruthy()
  })

  it('refuses to resolve a targeted option with the wrong number of targets', () => {
    // rng picks index 1 of TAROT_CARDS ('magician', minTargets 1, maxTargets 2)
    const magicianRng = () => 0.05
    const slot: ShopSlot = { id: 'pack1', kind: 'pack', packCategory: 'arcana', packSize: 'normal', cost: 4 }
    let state = shopState({ shopOffers: [slot], hand: [] })
    state = openPackSlot(state, 'pack1', magicianRng)
    const optionId = state.packOpening!.options[0].optionId
    const before = state.packOpening
    state = choosePackOption(state, optionId, []) // 0 targets, needs 1-2
    expect(state.packOpening).toEqual(before)
  })

  it('skipping a pack early forfeits remaining choices', () => {
    const slot: ShopSlot = { id: 'pack1', kind: 'pack', packCategory: 'buffoon', packSize: 'mega', cost: 8 }
    let state = shopState({ shopOffers: [slot] })
    state = openPackSlot(state, 'pack1')
    expect(state.packOpening?.chooseRemaining).toBe(2)
    state = skipPackOpening(state)
    expect(state.packOpening).toBeNull()
  })
})

describe('buyVoucher', () => {
  it('purchases the offered voucher, applying its permanent effect', () => {
    let state: RunState = { ...readyState(), phase: 'shop', money: 20, voucherOffer: 'grabber' }
    state = buyVoucher(state)
    expect(state.money).toBe(10)
    expect(state.ownedVouchers).toContain('grabber')
    expect(state.bonusHandsPerRound).toBe(1)
    expect(state.voucherOffer).toBeNull()
  })

  it('does nothing without enough money', () => {
    let state: RunState = { ...readyState(), phase: 'shop', money: 5, voucherOffer: 'grabber' }
    state = buyVoucher(state)
    expect(state.ownedVouchers).toHaveLength(0)
  })
})

describe('rerollBossBlind', () => {
  it("does nothing without Director's Cut", () => {
    let state: RunState = { ...readyState(), phase: 'blind-select', blind: 'boss', money: 50 }
    const before = state.bossOverrideId
    state = rerollBossBlind(state)
    expect(state.bossOverrideId).toBe(before)
    expect(state.money).toBe(50)
  })

  it("rerolls once per Ante with Director's Cut, then refuses a second time", () => {
    let state: RunState = {
      ...readyState(),
      phase: 'blind-select',
      blind: 'boss',
      money: 50,
      ownedVouchers: ['directors_cut'],
    }
    state = rerollBossBlind(state)
    expect(state.money).toBe(40)
    expect(state.bossOverrideId).not.toBeNull()
    expect(state.bossRerollUsedThisAnte).toBe(true)

    const overrideAfterFirst = state.bossOverrideId
    state = rerollBossBlind(state)
    expect(state.bossOverrideId).toBe(overrideAfterFirst)
    expect(state.money).toBe(40)
  })
})

describe('reorderCats', () => {
  it('swaps two adjacent owned cats', () => {
    let state = { ...readyState(), ownedCats: [owned('a'), owned('b'), owned('c')] }
    state = reorderCats(state, 'b-inst-0', 'left')
    expect(state.ownedCats.map((c) => c.defId)).toEqual(['b', 'a', 'c'])
  })

  it('does nothing at the edges', () => {
    let state = { ...readyState(), ownedCats: [owned('a'), owned('b')] }
    state = reorderCats(state, 'a-inst-0', 'left')
    expect(state.ownedCats.map((c) => c.defId)).toEqual(['a', 'b'])
  })
})

describe('seals integrated through play/discard', () => {
  it('discarding a Purple Seal card creates a random Tarot card', () => {
    let state = startRound(readyState())
    const purpleCard = { ...state.hand[0], seals: ['purple' as const] }
    state = { ...state, hand: [purpleCard, ...state.hand.slice(1)] }
    state = toggleSelect(state, purpleCard.id)
    state = discardSelected(state)
    expect(state.consumables).toHaveLength(1)
    expect(state.consumables[0].kind).toBe('tarot')
  })

  it('a Gold-enhancement card held at round end pays $3, and a Blue Seal creates the winning hand’s Planet card', () => {
    let state = startRound(readyState())
    state = { ...state, target: 0 } // force an immediate win on the first play
    const goldCard = { ...state.hand[1], enhancement: 'gold' as const }
    const blueCard = { ...state.hand[2], seals: ['blue' as const] }
    state = { ...state, hand: [state.hand[0], goldCard, blueCard, ...state.hand.slice(3)] }

    state = toggleSelect(state, state.hand[0].id)
    state = playHand(state)

    expect(state.phase).toBe('shop')
    // start money 4 + gold card $3 held + (blind reward $3 + interest floor(7/5)=1) = 11
    expect(state.money).toBe(11)
    expect(state.consumables.some((c) => c.kind === 'planet' && c.cardId === 'pluto')).toBe(true)
  })
})
