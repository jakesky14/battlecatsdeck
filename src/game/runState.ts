import type { Card, Suit } from './cards'
import { createDeck, shuffle } from './cards'
import type { BlindKind, OwnedCat } from './cats/types'
import { ownedCatSlotCount } from './cats/types'
import { catDef } from './cats/roster'
import { computeScore, type ScoreResult } from './scoring'
import { defaultHandLevels, handTypeDef, type HandTypeId } from '../data/handTypes'
import { planetCard, planetForHandType } from '../data/planets'
import { TAROT_CARDS, type TarotId } from '../data/tarots'
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
import { applyTarot } from './tarot'
import { GOLD_CARD_HELD_MONEY, PLANET_SELL_VALUE, TAROT_SELL_VALUE, editionPriceDelta } from './cardMods'
import { MAX_CONSUMABLE_SLOTS, type ConsumableItem } from './consumables'
import { pick } from './rng'

export const HAND_SIZE = 8
export const STARTING_HANDS = 4
export const STARTING_DISCARDS = 3
export const STARTING_MONEY = 4

export type Phase = 'mode-select' | 'blind-select' | 'playing' | 'shop' | 'game-over' | 'victory'

/** 'enemy': blinds are enemies with HP. 'classic': blinds are a plain score target, like original Balatro. */
export type GameMode = 'enemy' | 'classic'

export interface LastConsumableUsed {
  kind: 'tarot' | 'planet'
  id: string
}

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
  /** Permanent card changes (Strength, Death, Star/Moon/Sun/World, enhancement Tarot cards), keyed by
   *  original deck card id. Applied whenever a fresh round deck is dealt, so they survive across rounds. */
  cardOverrides: Record<string, Partial<Pick<Card, 'rank' | 'suit' | 'enhancement' | 'seals' | 'edition'>>>
  consumables: ConsumableItem[]
  lastConsumableUsed: LastConsumableUsed | null
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
    cardOverrides: {},
    consumables: [],
    lastConsumableUsed: null,
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
  const deck = createDeck()
    .filter((c) => !removed.has(c.id))
    .map((c) => (state.cardOverrides[c.id] ? { ...c, ...state.cardOverrides[c.id] } : c))
  const shuffled = shuffle(deck)

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

export function clearSelection(state: RunState): RunState {
  if (state.selectedIds.length === 0) return state
  return { ...state, selectedIds: [] }
}

export function reorderHand(state: RunState, cardId: string, direction: 'left' | 'right'): RunState {
  if (state.phase !== 'playing') return state
  const index = state.hand.findIndex((c) => c.id === cardId)
  if (index === -1) return state
  const swapWith = direction === 'left' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= state.hand.length) return state

  const hand = [...state.hand]
  ;[hand[index], hand[swapWith]] = [hand[swapWith], hand[index]]
  return { ...state, hand }
}

/** Reorders owned Cats — order matters for any future Cat whose effect depends on board position. */
export function reorderCats(state: RunState, instanceId: string, direction: 'left' | 'right'): RunState {
  const index = state.ownedCats.findIndex((c) => c.instanceId === instanceId)
  if (index === -1) return state
  const swapWith = direction === 'left' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= state.ownedCats.length) return state

  const ownedCats = [...state.ownedCats]
  ;[ownedCats[index], ownedCats[swapWith]] = [ownedCats[swapWith], ownedCats[index]]
  return { ...state, ownedCats }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Gold enhancement money + Blue Seal Planet creation, checked once when a round actually ends. */
function applyRoundEndHeldEffects(
  state: RunState,
  heldCards: Card[],
  won: boolean,
  winningHandType: HandTypeId | null,
): RunState {
  let money = state.money
  for (const card of heldCards) {
    if (card.enhancement === 'gold') money += GOLD_CARD_HELD_MONEY
  }

  let consumables = state.consumables
  if (won && winningHandType) {
    const planet = planetForHandType(winningHandType)
    if (planet) {
      for (const card of heldCards) {
        if (!card.seals?.includes('blue')) continue
        if (consumables.length >= MAX_CONSUMABLE_SLOTS) continue
        consumables = [...consumables, { instanceId: newId(planet.id), kind: 'planet', cardId: planet.id }]
      }
    }
  }

  return { ...state, money, consumables }
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
    heldCards: remainingHand,
  })

  const roundScore = state.roundScore + result.total
  const handsRemaining = state.handsRemaining - 1
  const handsPlayedThisRound = state.handsPlayedThisRound + 1
  const { hand, drawPile } = drawUpTo(remainingHand, state.drawPile, state.roundHandSize)
  const discardPile = [...state.discardPile, ...playedCards]

  let money = state.money + result.moneyGained
  if (state.moneyDrainThisRound) money = Math.max(0, money - 1)

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

  if (result.destroyedCardIds.length > 0) {
    const cardOverrides = { ...next.cardOverrides }
    for (const id of result.destroyedCardIds) delete cardOverrides[id]
    next = {
      ...next,
      removedCardIds: [...next.removedCardIds, ...result.destroyedCardIds],
      cardOverrides,
    }
  }

  if (won) {
    next = applyRoundEndHeldEffects(next, remainingHand, true, result.handType)
    next = winRound(next)
  } else if (lost) {
    next = applyRoundEndHeldEffects(next, remainingHand, false, null)
    next = { ...next, phase: 'game-over' }
  }

  return next
}

export function discardSelected(state: RunState): RunState {
  if (state.phase !== 'playing' || state.selectedIds.length === 0 || state.discardsRemaining <= 0) {
    return state
  }
  const discarded = state.hand.filter((c) => state.selectedIds.includes(c.id))
  const remainingHand = state.hand.filter((c) => !state.selectedIds.includes(c.id))
  const { hand, drawPile } = drawUpTo(remainingHand, state.drawPile, state.roundHandSize)

  let consumables = state.consumables
  const created: string[] = []
  for (const card of discarded) {
    if (!card.seals?.includes('purple')) continue
    if (consumables.length >= MAX_CONSUMABLE_SLOTS) continue
    const def = pick(TAROT_CARDS, Math.random)
    consumables = [...consumables, { instanceId: newId(def.id), kind: 'tarot', cardId: def.id }]
    created.push(`${def.icon} ${def.name}`)
  }

  return {
    ...state,
    hand,
    drawPile,
    discardPile: [...state.discardPile, ...discarded],
    selectedIds: [],
    discardsRemaining: state.discardsRemaining - 1,
    discardsUsedThisRound: state.discardsUsedThisRound + 1,
    consumables,
    message: created.length > 0 ? `🟣 Purple Seal creates ${created.join(' & ')}!` : state.message,
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
    if (ownedCatSlotCount(state.ownedCats) >= effectiveMaxCatSlots(state.bonusCatSlots)) return state

    const instance: OwnedCat = {
      instanceId: newId(slot.catId),
      defId: slot.catId,
      disabledThisRound: false,
      edition: slot.catEdition,
    }

    return {
      ...state,
      money: state.money - slot.cost,
      ownedCats: [...state.ownedCats, instance],
      shopOffers: state.shopOffers.filter((s) => s.id !== slotId),
      message: slot.catEdition ? `Recruited a ${slot.catEdition} ${catDef(slot.catId).name}!` : null,
    }
  }

  if (!slot.packCategory) return state

  if (slot.packCategory === 'tarot') {
    if (state.consumables.length >= MAX_CONSUMABLE_SLOTS) return state
    const def = pick(TAROT_CARDS, Math.random)
    const item: ConsumableItem = { instanceId: newId(def.id), kind: 'tarot', cardId: def.id }
    return {
      ...state,
      money: state.money - slot.cost,
      consumables: [...state.consumables, item],
      shopOffers: state.shopOffers.filter((s) => s.id !== slotId),
      message: `Added ${def.icon} ${def.name} to your consumables!`,
    }
  }

  const afterPurchase = { ...state, money: state.money - slot.cost }
  const { state: nextState, message } = openPack(slot.packCategory, afterPurchase)

  return {
    ...nextState,
    shopOffers: nextState.shopOffers.filter((s) => s.id !== slotId),
    message,
  }
}

/** Uses a held consumable. `targetIds` are cards selected from the current
 *  hand, required only for Tarot cards whose definition has minTargets > 0.
 *  A 'planet' item (from a Blue Seal) just levels up its hand type instantly. */
export function useConsumable(state: RunState, instanceId: string, targetIds: string[]): RunState {
  const usablePhases: Phase[] = ['blind-select', 'playing', 'shop']
  if (!usablePhases.includes(state.phase)) return state

  const item = state.consumables.find((c) => c.instanceId === instanceId)
  if (!item) return state

  if (item.kind === 'planet') {
    const planet = planetCard(item.cardId)
    const newLevel = (state.handLevels[planet.handType] ?? 1) + 1
    return {
      ...state,
      handLevels: { ...state.handLevels, [planet.handType]: newLevel },
      consumables: state.consumables.filter((c) => c.instanceId !== instanceId),
      lastConsumableUsed: { kind: 'planet', id: planet.id },
      selectedIds: [],
      message: `${planet.icon} ${planet.name}: ${handTypeDef(planet.handType).label} leveled up to Lv.${newLevel}!`,
    }
  }

  const def = TAROT_CARDS.find((t) => t.id === item.cardId)
  if (!def) return state
  if (targetIds.length < def.minTargets || targetIds.length > def.maxTargets) return state
  if (def.minTargets > 0 && state.phase !== 'playing') return state

  const stateWithoutItem: RunState = {
    ...state,
    consumables: state.consumables.filter((c) => c.instanceId !== instanceId),
  }
  const { state: nextState, message } = applyTarot(def.id as TarotId, stateWithoutItem, targetIds)

  return { ...nextState, selectedIds: [], message }
}

export function sellConsumable(state: RunState, instanceId: string): RunState {
  const item = state.consumables.find((c) => c.instanceId === instanceId)
  if (!item) return state
  const value = item.kind === 'planet' ? PLANET_SELL_VALUE : TAROT_SELL_VALUE
  return {
    ...state,
    money: state.money + value,
    consumables: state.consumables.filter((c) => c.instanceId !== instanceId),
  }
}

export function sellCat(state: RunState, instanceId: string): RunState {
  const owned = state.ownedCats.find((c) => c.instanceId === instanceId)
  if (!owned) return state
  const def = catDef(owned.defId)
  const value = def.sellValue + editionPriceDelta(owned.edition)
  return {
    ...state,
    money: state.money + value,
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
