import type { Card, Suit } from './cards'
import { createDeck, shuffle } from './cards'
import type { BlindKind, OwnedCat } from './cats/types'
import { catDef } from './cats/roster'
import { computeScore, type ScoreResult } from './scoring'
import { defaultHandLevels, type HandTypeId } from '../data/handTypes'
import {
  BLIND_REWARD,
  MAX_ANTE,
  SKIP_BONUS,
  bossBlindForAnte,
  interestEarned,
  targetScore,
} from './blinds'
import { generateShopSlots, rerollCost, type ShopSlot } from './shop'
import { effectiveMaxCatSlots, openPack } from './packs'

export const HAND_SIZE = 8
export const STARTING_HANDS = 4
export const STARTING_DISCARDS = 3
export const STARTING_MONEY = 4

export type Phase = 'mode-select' | 'blind-select' | 'playing' | 'shop' | 'game-over' | 'victory'

/** 'enemy': blinds are enemies with HP. 'classic': blinds are a plain score target, like original Balatro. */
export type GameMode = 'enemy' | 'classic'

export interface RunState {
  phase: Phase
  mode: GameMode
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
  bannedSuitThisRound: Suit | null
  moneyDrainThisRound: boolean
  roundHandSize: number
  lastResult: ScoreResult | null
  shopOffers: ShopSlot[]
  rerollsUsedThisShop: number
  message: string | null
  handLevels: Record<HandTypeId, number>
  bonusHandsPerRound: number
  bonusDiscardsPerRound: number
  bonusCatSlots: number
  removedCardIds: string[]
}

export function createInitialRunState(): RunState {
  return {
    phase: 'mode-select',
    mode: 'enemy',
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
    bannedSuitThisRound: null,
    moneyDrainThisRound: false,
    roundHandSize: HAND_SIZE,
    lastResult: null,
    shopOffers: [],
    rerollsUsedThisShop: 0,
    message: null,
    handLevels: defaultHandLevels(),
    bonusHandsPerRound: 0,
    bonusDiscardsPerRound: 0,
    bonusCatSlots: 0,
    removedCardIds: [],
  }
}

export function chooseMode(state: RunState, mode: GameMode): RunState {
  if (state.phase !== 'mode-select') return state
  return { ...state, mode, phase: 'blind-select' }
}

function drawUpTo(hand: Card[], drawPile: Card[], size: number): { hand: Card[]; drawPile: Card[] } {
  const needed = Math.max(0, size - hand.length)
  const drawn = drawPile.slice(0, needed)
  return { hand: [...hand, ...drawn], drawPile: drawPile.slice(needed) }
}

export function startRound(state: RunState): RunState {
  if (state.phase !== 'blind-select') return state
  const boss = state.blind === 'boss' ? bossBlindForAnte(state.ante) : null

  const removed = new Set(state.removedCardIds)
  const shuffled = shuffle(createDeck().filter((c) => !removed.has(c.id)))

  const roundHandSize = Math.max(1, HAND_SIZE - (boss?.effect === 'reduced_hand_size' ? 2 : 0))
  const hand = shuffled.slice(0, roundHandSize)
  const drawPile = shuffled.slice(roundHandSize)

  const handsReduction = boss?.effect === 'reduced_hands' || boss?.effect === 'gauntlet' ? 1 : 0
  const handsRemaining = Math.max(1, STARTING_HANDS + state.bonusHandsPerRound - handsReduction)

  const discardsReduction = boss?.effect === 'reduced_discards' ? 1 : 0
  const discardsRemaining = Math.max(
    0,
    STARTING_DISCARDS + state.bonusDiscardsPerRound - discardsReduction,
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
    roundHandSize,
    catsDisabledThisRound: boss?.effect === 'disable_cats',
    bannedSuitThisRound: boss?.effect === 'ban_suit' ? boss.bannedSuit ?? null : null,
    moneyDrainThisRound: boss?.effect === 'money_drain',
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

  const shopOffers = generateShopSlots(ownedCats.map((c) => c.defId))

  return {
    ...state,
    phase: 'shop',
    money,
    ownedCats,
    ante,
    blind,
    shopOffers,
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
    handLevels: state.handLevels,
    bannedSuit: state.bannedSuitThisRound,
  })

  const roundScore = state.roundScore + result.total
  const handsRemaining = state.handsRemaining - 1
  const handsPlayedThisRound = state.handsPlayedThisRound + 1
  const { hand, drawPile } = drawUpTo(remainingHand, state.drawPile, state.roundHandSize)
  const discardPile = [...state.discardPile, ...playedCards]
  const money = state.moneyDrainThisRound ? Math.max(0, state.money - 1) : state.money

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
    money,
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
  const { hand, drawPile } = drawUpTo(remainingHand, state.drawPile, state.roundHandSize)

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

export function buyShopSlot(state: RunState, slotId: string): RunState {
  if (state.phase !== 'shop') return state
  const slot = state.shopOffers.find((s) => s.id === slotId)
  if (!slot) return state
  if (state.money < slot.cost) return state

  if (slot.kind === 'cat') {
    if (!slot.catId) return state
    if (state.ownedCats.length >= effectiveMaxCatSlots(state.bonusCatSlots)) return state

    const instance: OwnedCat = {
      instanceId: `${slot.catId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      defId: slot.catId,
      disabledThisRound: false,
    }

    return {
      ...state,
      money: state.money - slot.cost,
      ownedCats: [...state.ownedCats, instance],
      shopOffers: state.shopOffers.filter((s) => s.id !== slotId),
      message: null,
    }
  }

  if (!slot.packCategory) return state
  const afterPurchase = { ...state, money: state.money - slot.cost }
  const { state: nextState, message } = openPack(slot.packCategory, afterPurchase)

  return {
    ...nextState,
    shopOffers: nextState.shopOffers.filter((s) => s.id !== slotId),
    message,
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

  const shopOffers = generateShopSlots(state.ownedCats.map((c) => c.defId))

  return {
    ...state,
    money: state.money - cost,
    shopOffers,
    rerollsUsedThisShop: state.rerollsUsedThisShop + 1,
  }
}

export function leaveShop(state: RunState): RunState {
  if (state.phase !== 'shop') return state
  return { ...state, phase: 'blind-select', target: targetScore(state.ante, state.blind), message: null }
}
