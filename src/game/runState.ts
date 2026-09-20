import type { Card } from './cards'
import { createDeck, shuffle } from './cards'
import type { BlindKind, OwnedCat } from './cats/types'
import { catDef } from './cats/roster'
import { computeScore, type ScoreResult } from './scoring'
import {
  BLIND_REWARD,
  MAX_ANTE,
  SKIP_BONUS,
  bossBlindForAnte,
  interestEarned,
  targetScore,
} from './blinds'
import { MAX_CAT_SLOTS, SHOP_SIZE, generateShopOffers, rerollCost } from './shop'

export const HAND_SIZE = 8
export const STARTING_HANDS = 4
export const STARTING_DISCARDS = 3
export const STARTING_MONEY = 4

export type Phase = 'blind-select' | 'playing' | 'shop' | 'game-over' | 'victory'

export interface RunState {
  phase: Phase
  ante: number
  blind: BlindKind
  money: number
  drawPile: Card[]
  hand: Card[]
  selectedIds: string[]
  discardPile: Card[]
  ownedCats: OwnedCat[]
  handsRemaining: number
  discardsRemaining: number
  handsPlayedThisRound: number
  discardsUsedThisRound: number
  roundScore: number
  target: number
  catsDisabledThisRound: boolean
  lastResult: ScoreResult | null
  shopOffers: string[]
  rerollsUsedThisShop: number
  message: string | null
}

export function createInitialRunState(): RunState {
  return {
    phase: 'blind-select',
    ante: 1,
    blind: 'small',
    money: STARTING_MONEY,
    drawPile: [],
    hand: [],
    selectedIds: [],
    discardPile: [],
    ownedCats: [],
    handsRemaining: STARTING_HANDS,
    discardsRemaining: STARTING_DISCARDS,
    handsPlayedThisRound: 0,
    discardsUsedThisRound: 0,
    roundScore: 0,
    target: targetScore(1, 'small'),
    catsDisabledThisRound: false,
    lastResult: null,
    shopOffers: [],
    rerollsUsedThisShop: 0,
    message: null,
  }
}

function drawUpTo(hand: Card[], drawPile: Card[], size: number): { hand: Card[]; drawPile: Card[] } {
  const needed = Math.max(0, size - hand.length)
  const drawn = drawPile.slice(0, needed)
  return { hand: [...hand, ...drawn], drawPile: drawPile.slice(needed) }
}

function removeFirst(arr: string[], value: string): string[] {
  const idx = arr.indexOf(value)
  if (idx === -1) return arr
  const copy = [...arr]
  copy.splice(idx, 1)
  return copy
}

export function startRound(state: RunState): RunState {
  if (state.phase !== 'blind-select') return state
  const boss = state.blind === 'boss' ? bossBlindForAnte(state.ante) : null
  const shuffled = shuffle(createDeck())
  const hand = shuffled.slice(0, HAND_SIZE)
  const drawPile = shuffled.slice(HAND_SIZE)
  const handsRemaining = Math.max(1, STARTING_HANDS - (boss?.effect === 'reduced_hands' ? 1 : 0))
  const discardsRemaining = Math.max(
    0,
    STARTING_DISCARDS - (boss?.effect === 'reduced_discards' ? 1 : 0),
  )

  return {
    ...state,
    phase: 'playing',
    hand,
    drawPile,
    discardPile: [],
    selectedIds: [],
    handsRemaining,
    discardsRemaining,
    handsPlayedThisRound: 0,
    discardsUsedThisRound: 0,
    roundScore: 0,
    target: targetScore(state.ante, state.blind),
    catsDisabledThisRound: boss?.effect === 'disable_cats',
    lastResult: null,
    message: null,
  }
}

export function toggleSelect(state: RunState, cardId: string): RunState {
  if (state.phase !== 'playing') return state
  const isSelected = state.selectedIds.includes(cardId)
  if (isSelected) {
    return { ...state, selectedIds: state.selectedIds.filter((id) => id !== cardId) }
  }
  if (state.selectedIds.length >= 5) return state
  return { ...state, selectedIds: [...state.selectedIds, cardId] }
}

function winRound(state: RunState): RunState {
  const reward = BLIND_REWARD[state.blind] + interestEarned(state.money)
  const money = state.money + reward
  const ownedCats = state.ownedCats.map((c) => ({ ...c, disabledThisRound: false }))

  if (state.blind === 'boss' && state.ante >= MAX_ANTE) {
    return { ...state, phase: 'victory', money, ownedCats }
  }

  let ante = state.ante
  let blind: BlindKind = state.blind
  if (state.blind === 'small') blind = 'big'
  else if (state.blind === 'big') blind = 'boss'
  else {
    ante += 1
    blind = 'small'
  }

  const offers = generateShopOffers(
    SHOP_SIZE,
    ownedCats.map((c) => c.defId),
  )

  return {
    ...state,
    phase: 'shop',
    money,
    ownedCats,
    ante,
    blind,
    shopOffers: offers.map((o) => o.id),
    rerollsUsedThisShop: 0,
    message: `Round won! +$${reward}`,
  }
}

export function playHand(state: RunState): RunState {
  if (state.phase !== 'playing' || state.selectedIds.length === 0 || state.handsRemaining <= 0) {
    return state
  }

  const playedCards = state.hand.filter((c) => state.selectedIds.includes(c.id))
  const remainingHand = state.hand.filter((c) => !state.selectedIds.includes(c.id))

  const result = computeScore(playedCards, state.ownedCats, {
    discardsUsedThisRound: state.discardsUsedThisRound,
    handsPlayedThisRound: state.handsPlayedThisRound,
    ante: state.ante,
    blind: state.blind,
    catsDisabled: state.catsDisabledThisRound,
  })

  const roundScore = state.roundScore + result.total
  const handsRemaining = state.handsRemaining - 1
  const handsPlayedThisRound = state.handsPlayedThisRound + 1
  const { hand, drawPile } = drawUpTo(remainingHand, state.drawPile, HAND_SIZE)
  const discardPile = [...state.discardPile, ...playedCards]

  const won = roundScore >= state.target
  const lost = !won && handsRemaining <= 0

  let next: RunState = {
    ...state,
    hand,
    drawPile,
    discardPile,
    selectedIds: [],
    roundScore,
    handsRemaining,
    handsPlayedThisRound,
    lastResult: result,
  }

  if (won) next = winRound(next)
  else if (lost) next = { ...next, phase: 'game-over' }

  return next
}

export function discardSelected(state: RunState): RunState {
  if (state.phase !== 'playing' || state.selectedIds.length === 0 || state.discardsRemaining <= 0) {
    return state
  }
  const discarded = state.hand.filter((c) => state.selectedIds.includes(c.id))
  const remainingHand = state.hand.filter((c) => !state.selectedIds.includes(c.id))
  const { hand, drawPile } = drawUpTo(remainingHand, state.drawPile, HAND_SIZE)

  return {
    ...state,
    hand,
    drawPile,
    discardPile: [...state.discardPile, ...discarded],
    selectedIds: [],
    discardsRemaining: state.discardsRemaining - 1,
    discardsUsedThisRound: state.discardsUsedThisRound + 1,
  }
}

export function skipBlind(state: RunState): RunState {
  if (state.phase !== 'blind-select' || state.blind === 'boss') return state
  const money = state.money + SKIP_BONUS
  const blind: BlindKind = state.blind === 'small' ? 'big' : 'boss'
  return { ...state, money, blind, target: targetScore(state.ante, blind) }
}

export function buyCat(state: RunState, defId: string): RunState {
  if (state.phase !== 'shop') return state
  if (state.ownedCats.length >= MAX_CAT_SLOTS) return state
  if (!state.shopOffers.includes(defId)) return state
  const def = catDef(defId)
  if (state.money < def.cost) return state

  const instance: OwnedCat = {
    instanceId: `${defId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    defId,
    disabledThisRound: false,
  }

  return {
    ...state,
    money: state.money - def.cost,
    ownedCats: [...state.ownedCats, instance],
    shopOffers: removeFirst(state.shopOffers, defId),
  }
}

export function sellCat(state: RunState, instanceId: string): RunState {
  const owned = state.ownedCats.find((c) => c.instanceId === instanceId)
  if (!owned) return state
  const def = catDef(owned.defId)
  return {
    ...state,
    money: state.money + def.sellValue,
    ownedCats: state.ownedCats.filter((c) => c.instanceId !== instanceId),
  }
}

export function rerollShop(state: RunState): RunState {
  if (state.phase !== 'shop') return state
  const cost = rerollCost(state.rerollsUsedThisShop)
  if (state.money < cost) return state

  const offers = generateShopOffers(
    SHOP_SIZE,
    state.ownedCats.map((c) => c.defId),
  )

  return {
    ...state,
    money: state.money - cost,
    shopOffers: offers.map((o) => o.id),
    rerollsUsedThisShop: state.rerollsUsedThisShop + 1,
  }
}

export function leaveShop(state: RunState): RunState {
  if (state.phase !== 'shop') return state
  return { ...state, phase: 'blind-select', target: targetScore(state.ante, state.blind), message: null }
}
