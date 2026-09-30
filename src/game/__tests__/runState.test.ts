import { describe, expect, it } from 'vitest'
import {
  buyShopSlot,
  buyVoucher,
  chooseMode,
  choosePackOption,
  createInitialRunState,
  discardSelected,
  leaveShop,
  openPackSlot,
  playHand,
  reorderCats,
  rerollBossBlind,
  rerollShop,
  sellCat,
  sellConsumable,
  skipBlind,
  skipPackOpening,
  startRound,
  toggleSelect,
  useConsumable,
} from '../runState'
import { applyTarot } from '../tarot'
import type { RunState } from '../runState'
import type { ShopSlot } from '../shop'
import type { OwnedCat } from '../cats/types'
import type { ConsumableItem } from '../consumables'

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

  it('Clearance Sale discounts the voucher price by 25%, rounded down', () => {
    let state: RunState = {
      ...readyState(),
      phase: 'shop',
      money: 20,
      voucherOffer: 'grabber',
      ownedVouchers: ['clearance_sale'],
    }
    state = buyVoucher(state)
    expect(state.money).toBe(20 - 7) // floor(10 * 0.75) = 7
    expect(state.lifetime.totalSpentAtShop).toBe(7)
  })

  it("Liquidation's 50% discount replaces Clearance Sale's rate for vouchers too", () => {
    let state: RunState = {
      ...readyState(),
      phase: 'shop',
      money: 20,
      voucherOffer: 'grabber',
      ownedVouchers: ['clearance_sale', 'liquidation'],
    }
    state = buyVoucher(state)
    expect(state.money).toBe(20 - 5)
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

describe('hand carries forward from shop into the next round', () => {
  it('the exact same hand persists, and a shop-phase Tarot edit on it sticks', () => {
    let state = startRound(readyState())
    state = { ...state, target: 0 } // force an immediate win on first play
    const cardId = state.hand[0].id
    state = toggleSelect(state, cardId)
    state = playHand(state)
    expect(state.phase).toBe('shop')

    const handInShop = state.hand.map((c) => c.id).sort()
    const targetCardId = state.hand[0].id
    const previousRank = state.hand[0].rank

    const { state: edited } = applyTarot('strength', state, [targetCardId])
    state = edited

    state = leaveShop(state)
    state = startRound(state)

    expect(state.phase).toBe('playing')
    expect(state.hand.map((c) => c.id).sort()).toEqual(handInShop)
    const carried = state.hand.find((c) => c.id === targetCardId)
    expect(carried?.rank).toBe(previousRank === 14 ? 2 : previousRank + 1)
  })
})

describe('lifetime meta-progress tracking', () => {
  function shopState(overrides: Partial<RunState>): RunState {
    return { ...readyState(), phase: 'shop', money: 1000, ...overrides }
  }

  it('playing cards adds to lifetime.cardsPlayed', () => {
    let state = startRound(readyState())
    state = toggleSelect(state, state.hand[0].id)
    state = toggleSelect(state, state.hand[1].id)
    state = playHand(state)
    expect(state.lifetime.cardsPlayed).toBe(2)
  })

  it('discarding cards adds to lifetime.cardsDiscarded', () => {
    let state = startRound(readyState())
    state = toggleSelect(state, state.hand[0].id)
    state = discardSelected(state)
    expect(state.lifetime.cardsDiscarded).toBe(1)
  })

  it('buying a single Tarot/Planet/Playing Card from the shop tracks its own counter and total spend', () => {
    const tarotSlot: ShopSlot = { id: 't1', kind: 'tarot', tarotId: 'hermit', cost: 3 }
    let state = shopState({ shopOffers: [tarotSlot] })
    state = buyShopSlot(state, 't1')
    expect(state.lifetime.tarotBoughtFromShop).toBe(1)
    expect(state.lifetime.totalSpentAtShop).toBe(3)

    const planetSlot: ShopSlot = { id: 'p1', kind: 'planet', planetId: 'pluto', cost: 3 }
    state = { ...state, shopOffers: [planetSlot] }
    state = buyShopSlot(state, 'p1')
    expect(state.lifetime.planetBoughtFromShop).toBe(1)
    expect(state.lifetime.totalSpentAtShop).toBe(6)

    const cardSlot: ShopSlot = { id: 'c1', kind: 'playing_card', card: { id: 'x', rank: 5, suit: 'hearts' }, cost: 1 }
    state = { ...state, shopOffers: [cardSlot] }
    state = buyShopSlot(state, 'c1')
    expect(state.lifetime.playingCardsBoughtFromShop).toBe(1)
    expect(state.lifetime.totalSpentAtShop).toBe(7)
  })

  it('rerolling the shop adds to lifetime.rerolls and totalSpentAtShop', () => {
    let state = shopState({})
    state = rerollShop(state)
    expect(state.lifetime.rerolls).toBe(1)
    expect(state.lifetime.totalSpentAtShop).toBe(5)
  })

  it('resolving a Tarot/Planet pack option tracks tarotFromPacks/planetFromPacks', () => {
    const slot: ShopSlot = { id: 'pack1', kind: 'pack', packCategory: 'celestial', packSize: 'normal', cost: 4 }
    let state = shopState({ shopOffers: [slot] })
    state = openPackSlot(state, 'pack1')
    const optionId = state.packOpening!.options[0].optionId
    state = choosePackOption(state, optionId, [])
    expect(state.lifetime.planetFromPacks).toBe(1)
  })

  it("buying Blenk tracks lifetime.blankRedeemed", () => {
    let state = shopState({ voucherOffer: 'blenk' })
    state = buyVoucher(state)
    expect(state.lifetime.blankRedeemed).toBe(1)
  })

  it('Nacho Tong/Recyclomancy/Palette/Antimatter stack additively with their base vouchers', () => {
    let state = shopState({ voucherOffer: 'grabber' })
    state = buyVoucher(state)
    state = { ...state, voucherOffer: 'nacho_tong' }
    state = buyVoucher(state)
    expect(state.bonusHandsPerRound).toBe(2)

    state = { ...state, voucherOffer: 'antimatter' }
    state = buyVoucher(state)
    expect(state.bonusCatSlots).toBe(1)
  })

  it('Petroglyph reduces discards on top of Hieroglyph reducing hands', () => {
    let state = shopState({ voucherOffer: 'hieroglyph' })
    state = buyVoucher(state)
    expect(state.bonusHandsPerRound).toBe(-1)
    state = { ...state, voucherOffer: 'petroglyph' }
    state = buyVoucher(state)
    expect(state.bonusDiscardsPerRound).toBe(-1)
    expect(state.bonusHandsPerRound).toBe(-1) // untouched by Petroglyph
  })

  it("Retcon removes Director's Cut's once-per-Ante Boss reroll limit", () => {
    let state: RunState = {
      ...readyState(),
      phase: 'blind-select',
      blind: 'boss',
      money: 1000,
      ownedVouchers: ['directors_cut', 'retcon'],
    }
    state = rerollBossBlind(state)
    const firstOverride = state.bossOverrideId
    expect(state.bossRerollUsedThisAnte).toBe(true)
    state = rerollBossBlind(state)
    expect(state.bossOverrideId).not.toBe(firstOverride)
  })

  it('Observatory gives x1.5 Mult per held Planet consumable matching the played hand', () => {
    const pairPlanet: ConsumableItem = { instanceId: 'p1', kind: 'planet', cardId: 'mercury' } // mercury -> pair
    let state = startRound({ ...readyState(), ownedVouchers: ['telescope', 'observatory'], consumables: [pairPlanet] })
    // force a pair: two 5s plus 3 unrelated low cards, selecting only the pair
    const hand = [
      { id: 'a', rank: 5 as const, suit: 'hearts' as const },
      { id: 'b', rank: 5 as const, suit: 'clubs' as const },
      { id: 'c', rank: 2 as const, suit: 'spades' as const },
    ]
    state = { ...state, hand, target: 999999 }
    state = toggleSelect(state, 'a')
    state = toggleSelect(state, 'b')
    const withoutObservatory: RunState = { ...state, ownedVouchers: ['telescope'] }
    const boosted = playHand(state)
    const unboosted = playHand(withoutObservatory)
    expect(boosted.lastResult!.mult).toBeCloseTo(unboosted.lastResult!.mult * 1.5)
  })

  it('reducing hand size via a Spectral card tracks lifetime.minHandSizeReached', () => {
    const ouija: ConsumableItem = { instanceId: 'o1', kind: 'spectral', cardId: 'ouija' }
    let state = startRound(readyState())
    state = { ...state, consumables: [ouija] }
    state = useConsumable(state, 'o1', [])
    expect(state.lifetime.minHandSizeReached).toBe(7) // HAND_SIZE(8) - 1
  })

  it('startRound tracks discoveredBlindIds and maxAnteReached', () => {
    const state = startRound(readyState())
    expect(state.lifetime.discoveredBlindIds).toContain('small')
    expect(state.lifetime.maxAnteReached).toBeGreaterThanOrEqual(1)
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

describe('skipBlind grants a Tag instead of flat money', () => {
  const low = () => 0

  it('advances the blind, grants a Tag, and increments blindsSkippedThisRun', () => {
    let state = readyState()
    state = skipBlind(state, low)
    expect(state.blind).toBe('big')
    expect(state.blindsSkippedThisRun).toBe(1)
    expect(state.message).toBeTruthy()
  })

  it('cannot skip the Boss Blind', () => {
    let state: RunState = { ...readyState(), blind: 'boss' }
    const before = state
    state = skipBlind(state, low)
    expect(state).toEqual(before)
  })

  it('two skips in a row can each grant a Tag (blindsSkippedThisRun keeps counting)', () => {
    let state = readyState()
    state = skipBlind(state, low) // small -> big
    state = skipBlind(state, low) // big -> boss
    expect(state.blind).toBe('boss')
    expect(state.blindsSkippedThisRun).toBe(2)
  })
})

describe('winRound applies pending Tag effects to the next shop', () => {
  it('a pending Uncommon Joker and free-shop flag both land on the generated shop', () => {
    let state = startRound(readyState())
    state = { ...state, target: 0, pendingUncommonJoker: true, pendingFreeShop: true }
    state = toggleSelect(state, state.hand[0].id)
    state = playHand(state)

    expect(state.phase).toBe('shop')
    expect(state.pendingUncommonJoker).toBe(false)
    expect(state.pendingFreeShop).toBe(false)
    expect(state.shopOffers.every((s) => s.cost === 0)).toBe(true)
    expect(state.shopOffers.some((s) => s.kind === 'joker')).toBe(true)
  })

  it('Investment Tag pays out on Boss Blind defeat, not Small/Big', () => {
    let state = startRound(readyState())
    state = { ...state, target: 0, blind: 'boss', pendingInvestmentPayouts: 1 }
    state = toggleSelect(state, state.hand[0].id)
    state = playHand(state)
    // start $4 + boss reward $5 + interest floor(4/5)=0 + $25 investment payout = 34
    expect(state.money).toBe(34)
    expect(state.pendingInvestmentPayouts).toBe(0)
  })

  it('D6 Tag makes rerolls in the next shop start at $0', () => {
    let state = startRound(readyState())
    state = { ...state, target: 0, pendingCheapReroll: true, money: 1000 }
    state = toggleSelect(state, state.hand[0].id)
    state = playHand(state)
    expect(state.cheapRerollThisShop).toBe(true)

    const beforeReroll = state.money
    state = rerollShop(state)
    expect(beforeReroll - state.money).toBe(0) // first reroll of the visit costs $0

    state = leaveShop(state)
    expect(state.cheapRerollThisShop).toBe(false) // resets after leaving
  })
})

describe('startRound applies Juggle Tag’s hand-size bonus once', () => {
  it('adds the pending bonus to hand size, then clears it', () => {
    let state = { ...readyState(), juggleBonusNextRound: 3 }
    state = startRound(state)
    expect(state.hand).toHaveLength(11) // HAND_SIZE 8 + 3
    expect(state.juggleBonusNextRound).toBe(0)
  })
})

describe('playHand tracks handsPlayedThisRun and unusedDiscardsThisRun', () => {
  it('increments handsPlayedThisRun on every play', () => {
    let state = startRound(readyState())
    state = { ...state, target: 999999 }
    state = toggleSelect(state, state.hand[0].id)
    state = playHand(state)
    expect(state.handsPlayedThisRun).toBe(1)
  })

  it('adds leftover discardsRemaining to unusedDiscardsThisRun at round end', () => {
    let state = startRound(readyState())
    state = { ...state, target: 0 } // win on first play, discardsRemaining still at 3
    state = toggleSelect(state, state.hand[0].id)
    state = playHand(state)
    expect(state.unusedDiscardsThisRun).toBe(3)
  })
})

describe('syncObtainedEditions unlocks the edition Tags', () => {
  it('buying an edition Cat from the shop records it in lifetime.obtainedEditions', () => {
    const slot: ShopSlot = { id: 'slot1', kind: 'joker', catId: 'cat', catEdition: 'foil', cost: 5 }
    let state: RunState = { ...readyState(), phase: 'shop', money: 100, shopOffers: [slot] }
    state = buyShopSlot(state, 'slot1')
    expect(state.lifetime.obtainedEditions).toContain('foil')
  })
})
