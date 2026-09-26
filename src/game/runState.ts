import type { Card, Suit } from './cards'
import { createDeck, shuffle } from './cards'
import type { BlindKind, OwnedCat } from './cats/types'
import { ownedCatSlotCount } from './cats/types'
import { catDef } from './cats/roster'
import { computeScore, type ScoreResult } from './scoring'
import { defaultHandLevels, HAND_TYPES, handTypeDef, type HandTypeId } from '../data/handTypes'
import { planetCard, planetForHandType } from '../data/planets'
import { TAROT_CARDS, tarotCard, type TarotId } from '../data/tarots'
import { spectralCard, type SpectralId } from '../data/spectrals'
import {
  BLIND_REWARD,
  BOSS_BLINDS,
  MAX_ANTE,
  SKIP_BONUS,
  bossBlindById,
  bossBlindForAnte,
  interestEarned,
  targetScore,
  type BossBlindDef,
} from './blinds'
import { generateShopSlots, rerollCost, type ShopGenContext, type ShopSlot } from './shop'
import {
  PACK_CONTENTS,
  effectiveMaxCatSlots,
  generatePackOptions,
  resolvePackOption,
  type PackCategory,
  type PackGenContext,
  type PackOptionEntry,
  type PackSize,
} from './packs'
import { applyTarot } from './tarot'
import { applySpectral } from './spectral'
import { GOLD_CARD_HELD_MONEY, PLANET_SELL_VALUE, SPECTRAL_SELL_VALUE, TAROT_SELL_VALUE, editionPriceDelta } from './cardMods'
import { effectiveMaxConsumableSlots, type ConsumableItem } from './consumables'
import { pick } from './rng'
import { VOUCHERS, effectiveAnte, hasVoucher, interestCap, voucherDef, type VoucherId } from './vouchers'

export const HAND_SIZE = 8
export const STARTING_HANDS = 4
export const STARTING_DISCARDS = 3
export const STARTING_MONEY = 4
export const BOSS_REROLL_COST = 10

export type Phase = 'mode-select' | 'blind-select' | 'playing' | 'shop' | 'game-over' | 'victory'

/** 'enemy': blinds are enemies with HP. 'classic': blinds are a plain score target, like original Balatro. */
export type GameMode = 'enemy' | 'classic'

export interface LastConsumableUsed {
  kind: 'tarot' | 'planet'
  id: string
}

export interface PackOpeningState {
  slotId: string
  category: PackCategory
  size: PackSize
  chooseRemaining: number
  options: PackOptionEntry[]
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
  /** Extra playing cards added to the deck beyond the base 52 (Standard Packs,
   *  Familiar/Grim/Incantation/Cryptid) — the deck can have more than 52 cards. */
  extraCards: Card[]
  ownedVouchers: VoucherId[]
  /** The 1 voucher currently offered in the shop; persists through Small/Big
   *  Blind shop visits and only restocks after a Boss Blind. */
  voucherOffer: VoucherId | null
  /** Flips true after the very first shop of the run is generated — gates the
   *  first-visit guaranteed Buffoon Pack and the first voucher roll. */
  hasSeenFirstShop: boolean
  handTypePlayCounts: Record<HandTypeId, number>
  /** Paint Brush (+1), Ectoplasm/Ouija (-1 each) — added to HAND_SIZE. */
  bonusHandSize: number
  /** Crystal Ball (+1) — added to MAX_CONSUMABLE_SLOTS. */
  bonusConsumableSlots: number
  /** Set by Director's Cut's Boss Blind reroll; cleared when a new Ante begins. */
  bossOverrideId: string | null
  bossRerollUsedThisAnte: boolean
  packOpening: PackOpeningState | null
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
    extraCards: [],
    ownedVouchers: [],
    voucherOffer: null,
    hasSeenFirstShop: false,
    handTypePlayCounts: Object.fromEntries(HAND_TYPES.map((h) => [h.id, 0])) as Record<HandTypeId, number>,
    bonusHandSize: 0,
    bonusConsumableSlots: 0,
    bossOverrideId: null,
    bossRerollUsedThisAnte: false,
    packOpening: null,
  }
}

export function chooseMode(state: RunState, mode: GameMode): RunState {
  if (state.phase !== 'mode-select') return state
  return { ...state, mode, phase: 'blind-select' }
}

/** Resolves which Boss Blind is actually in play — the Ante's usual boss,
 *  shifted by Hieroglyph's Ante offset, unless Director's Cut rerolled it. */
export function currentBossBlind(state: RunState): BossBlindDef {
  if (state.bossOverrideId) {
    const found = bossBlindById(state.bossOverrideId)
    if (found) return found
  }
  return bossBlindForAnte(effectiveAnte(state.ante, state.ownedVouchers))
}

function drawUpTo(hand: Card[], drawPile: Card[], size: number): { hand: Card[]; drawPile: Card[] } {
  const needed = Math.max(0, size - hand.length)
  const drawn = drawPile.slice(0, needed)
  return { hand: [...hand, ...drawn], drawPile: drawPile.slice(needed) }
}

export function startRound(state: RunState): RunState {
  if (state.phase !== 'blind-select') return state
  const boss = state.blind === 'boss' ? currentBossBlind(state) : null

  const removed = new Set(state.removedCardIds)
  const withOverrides = (c: Card) => (state.cardOverrides[c.id] ? { ...c, ...state.cardOverrides[c.id] } : c)
  const fullPool = [...createDeck(), ...state.extraCards].filter((c) => !removed.has(c.id)).map(withOverrides)

  // The hand as left in the shop (including any Tarot/Spectral edits made
  // there) carries forward unchanged — only the rest of the deck reshuffles.
  const carriedHand = state.hand.filter((c) => !removed.has(c.id)).map(withOverrides)
  const carriedIds = new Set(carriedHand.map((c) => c.id))
  const shuffledRest = shuffle(fullPool.filter((c) => !carriedIds.has(c.id)))

  const roundHandSize = Math.max(
    1,
    HAND_SIZE + state.bonusHandSize - (boss?.effect === 'reduced_hand_size' ? 2 : 0),
  )

  let hand = carriedHand
  let drawPile = shuffledRest
  if (hand.length < roundHandSize) {
    const needed = roundHandSize - hand.length
    hand = [...hand, ...drawPile.slice(0, needed)]
    drawPile = drawPile.slice(needed)
  } else if (hand.length > roundHandSize) {
    const overflow = hand.slice(roundHandSize)
    hand = hand.slice(0, roundHandSize)
    drawPile = [...overflow, ...drawPile]
  }

  const handsReduction = boss?.effect === 'reduced_hands' || boss?.effect === 'gauntlet' ? 1 : 0
  const handsRemaining = Math.max(1, STARTING_HANDS + state.bonusHandsPerRound - handsReduction)

  const discardsReduction = boss?.effect === 'reduced_discards' ? 1 : 0
  const discardsRemaining = Math.max(
    0,
    STARTING_DISCARDS + state.bonusDiscardsPerRound - discardsReduction,
  )

  const ante = effectiveAnte(state.ante, state.ownedVouchers)

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
    target: targetScore(ante, state.blind, boss ?? undefined),
    roundHandSize,
    catsDisabledThisRound: boss?.effect === 'disable_cats',
    bannedSuitThisRound: boss?.effect === 'ban_suit' ? boss.bannedSuit ?? null : null,
    moneyDrainThisRound: boss?.effect === 'money_drain',
    lastResult: null,
    message: null,
  }
}

export function toggleSelect(state: RunState, cardId: string): RunState {
  if (state.phase !== 'playing' && state.phase !== 'shop') return state
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
        if (consumables.length >= effectiveMaxConsumableSlots(state.bonusConsumableSlots)) continue
        consumables = [...consumables, { instanceId: newId(planet.id), kind: 'planet', cardId: planet.id }]
      }
    }
  }

  return { ...state, money, consumables }
}

function rollVoucherOffer(ownedVouchers: VoucherId[], rng: () => number = Math.random): VoucherId | null {
  const pool = VOUCHERS.filter((v) => !ownedVouchers.includes(v.id))
  if (pool.length === 0) return null
  return pick(pool, rng).id
}

function winRound(state: RunState): RunState {
  const cap = interestCap(state.ownedVouchers)
  const reward = BLIND_REWARD[state.blind] + interestEarned(state.money, cap)
  const money = state.money + reward
  const ownedCats = state.ownedCats.map((c) => ({ ...c, disabledThisRound: false }))

  if (state.blind === 'boss' && state.ante >= MAX_ANTE) {
    return { ...state, phase: 'victory', money, ownedCats }
  }

  const enteringNewAnte = state.blind === 'boss'
  let ante = state.ante
  let blind: BlindKind = state.blind
  if (state.blind === 'small') blind = 'big'
  else if (state.blind === 'big') blind = 'boss'
  else {
    ante += 1
    blind = 'small'
  }

  const forceBuffoonPack = !state.hasSeenFirstShop
  const shopCtx: ShopGenContext = {
    excludeCatIds: ownedCats.map((c) => c.defId),
    ownedVouchers: state.ownedVouchers,
    forceBuffoonPack,
  }
  const shopOffers = generateShopSlots(shopCtx)
  const voucherOffer = forceBuffoonPack || enteringNewAnte ? rollVoucherOffer(state.ownedVouchers) : state.voucherOffer

  return {
    ...state,
    phase: 'shop',
    money,
    ownedCats,
    ante,
    blind,
    shopOffers,
    voucherOffer,
    hasSeenFirstShop: true,
    bossOverrideId: enteringNewAnte ? null : state.bossOverrideId,
    bossRerollUsedThisAnte: enteringNewAnte ? false : state.bossRerollUsedThisAnte,
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
  const handTypePlayCounts = {
    ...state.handTypePlayCounts,
    [result.handType]: (state.handTypePlayCounts[result.handType] ?? 0) + 1,
  }

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
    handTypePlayCounts,
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
    if (consumables.length >= effectiveMaxConsumableSlots(state.bonusConsumableSlots)) continue
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
  const ante = effectiveAnte(state.ante, state.ownedVouchers)
  const boss = blind === 'boss' ? currentBossBlind(state) : undefined
  return { ...state, money, blind, target: targetScore(ante, blind, boss) }
}

export function buyShopSlot(state: RunState, slotId: string, rng: () => number = Math.random): RunState {
  if (state.phase !== 'shop') return state
  const slot = state.shopOffers.find((s) => s.id === slotId)
  if (!slot) return state
  if (state.money < slot.cost) return state

  if (slot.kind === 'joker') {
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
      message: slot.catEdition
        ? `Recruited a ${slot.catEdition} ${catDef(slot.catId).name}!`
        : `Recruited a ${catDef(slot.catId).name}!`,
    }
  }

  if (slot.kind === 'tarot') {
    if (!slot.tarotId) return state
    if (state.consumables.length >= effectiveMaxConsumableSlots(state.bonusConsumableSlots)) return state
    const def = tarotCard(slot.tarotId)
    const item: ConsumableItem = { instanceId: newId(def.id), kind: 'tarot', cardId: def.id }
    return {
      ...state,
      money: state.money - slot.cost,
      consumables: [...state.consumables, item],
      shopOffers: state.shopOffers.filter((s) => s.id !== slotId),
      message: `Added ${def.icon} ${def.name} to your consumables!`,
    }
  }

  if (slot.kind === 'planet') {
    if (!slot.planetId) return state
    const planet = planetCard(slot.planetId)
    const newLevel = (state.handLevels[planet.handType] ?? 1) + 1
    return {
      ...state,
      money: state.money - slot.cost,
      handLevels: { ...state.handLevels, [planet.handType]: newLevel },
      lastConsumableUsed: { kind: 'planet', id: planet.id },
      shopOffers: state.shopOffers.filter((s) => s.id !== slotId),
      message: `${planet.icon} ${planet.name}: ${handTypeDef(planet.handType).label} leveled up to Lv.${newLevel}!`,
    }
  }

  if (slot.kind === 'playing_card') {
    if (!slot.card) return state
    return {
      ...state,
      money: state.money - slot.cost,
      extraCards: [...state.extraCards, slot.card],
      shopOffers: state.shopOffers.filter((s) => s.id !== slotId),
      message: 'Added a card to your deck!',
    }
  }

  return openPackSlot(state, slotId, rng)
}

/** Buys and opens a Pack shop slot: rolls its options and enters pack-opening
 *  mode (see `packOpening`), without leaving the shop. */
export function openPackSlot(state: RunState, slotId: string, rng: () => number = Math.random): RunState {
  if (state.phase !== 'shop') return state
  const slot = state.shopOffers.find((s) => s.id === slotId)
  if (!slot || slot.kind !== 'pack' || !slot.packCategory || !slot.packSize) return state
  if (state.money < slot.cost) return state

  const ctx: PackGenContext = {
    excludeCatIds: state.ownedCats.map((c) => c.defId),
    handTypePlayCounts: state.handTypePlayCounts,
    hasTelescope: hasVoucher(state.ownedVouchers, 'telescope'),
    hasHone: hasVoucher(state.ownedVouchers, 'hone'),
  }
  const options = generatePackOptions(slot.packCategory, slot.packSize, ctx, rng)
  const { choose } = PACK_CONTENTS[slot.packCategory][slot.packSize]

  return {
    ...state,
    money: state.money - slot.cost,
    shopOffers: state.shopOffers.filter((s) => s.id !== slotId),
    packOpening: { slotId, category: slot.packCategory, size: slot.packSize, chooseRemaining: choose, options },
  }
}

/** Picks one option from the pack currently being opened. `targetIds` are
 *  hand cards selected by the player, needed only for Tarot/Spectral options
 *  that require targets. */
export function choosePackOption(
  state: RunState,
  optionId: string,
  targetIds: string[],
  rng: () => number = Math.random,
): RunState {
  const opening = state.packOpening
  if (!opening || opening.chooseRemaining <= 0) return state
  const entry = opening.options.find((o) => o.optionId === optionId)
  if (!entry) return state

  if (entry.option.kind === 'joker' && ownedCatSlotCount(state.ownedCats) >= effectiveMaxCatSlots(state.bonusCatSlots)) {
    return state
  }
  if (entry.option.kind === 'tarot') {
    const def = tarotCard(entry.option.id)
    if (targetIds.length < def.minTargets || targetIds.length > def.maxTargets) return state
  }
  if (entry.option.kind === 'spectral') {
    const def = spectralCard(entry.option.id)
    if (targetIds.length < def.minTargets || targetIds.length > def.maxTargets) return state
  }

  const { state: resolved, message } = resolvePackOption(entry.option, state, targetIds, rng)
  const remainingOptions = opening.options.filter((o) => o.optionId !== optionId)
  const chooseRemaining = opening.chooseRemaining - 1
  const packOpening =
    chooseRemaining > 0 && remainingOptions.length > 0 ? { ...opening, options: remainingOptions, chooseRemaining } : null

  return { ...resolved, selectedIds: [], packOpening, message }
}

/** Leaves the pack-opening screen early, forfeiting any unused picks. */
export function skipPackOpening(state: RunState): RunState {
  if (!state.packOpening) return state
  return { ...state, packOpening: null, selectedIds: [] }
}

export function buyVoucher(state: RunState): RunState {
  if (state.phase !== 'shop' || !state.voucherOffer) return state
  const id = state.voucherOffer
  if (state.ownedVouchers.includes(id)) return state
  const def = voucherDef(id)
  if (state.money < def.cost) return state

  let next: RunState = {
    ...state,
    money: state.money - def.cost,
    ownedVouchers: [...state.ownedVouchers, id],
    voucherOffer: null,
  }

  if (id === 'grabber') next = { ...next, bonusHandsPerRound: next.bonusHandsPerRound + 1 }
  if (id === 'wasteful') next = { ...next, bonusDiscardsPerRound: next.bonusDiscardsPerRound + 1 }
  if (id === 'paint_brush') next = { ...next, bonusHandSize: next.bonusHandSize + 1 }
  if (id === 'crystal_ball') next = { ...next, bonusConsumableSlots: next.bonusConsumableSlots + 1 }
  if (id === 'hieroglyph') next = { ...next, bonusHandsPerRound: next.bonusHandsPerRound - 1 }

  return { ...next, message: `Bought ${def.icon} ${def.name}!` }
}

/** Director's Cut: reroll the Boss Blind before facing it, $10, once per Ante. */
export function rerollBossBlind(state: RunState, rng: () => number = Math.random): RunState {
  if (state.phase !== 'blind-select' || state.blind !== 'boss') return state
  if (!hasVoucher(state.ownedVouchers, 'directors_cut')) return state
  if (state.bossRerollUsedThisAnte) return state
  if (state.money < BOSS_REROLL_COST) return state

  const current = currentBossBlind(state)
  const candidates = BOSS_BLINDS.filter((b) => b.id !== current.id)
  if (candidates.length === 0) return state
  const next = pick(candidates, rng)
  const ante = effectiveAnte(state.ante, state.ownedVouchers)

  return {
    ...state,
    money: state.money - BOSS_REROLL_COST,
    bossOverrideId: next.id,
    bossRerollUsedThisAnte: true,
    target: targetScore(ante, 'boss', next),
    message: `Rerolled the Boss Blind: ${next.icon} ${next.name}!`,
  }
}

/** Uses a held consumable. `targetIds` are cards selected from the current
 *  hand — either mid-round (`playing`) or from the leftover hand while in
 *  the shop, matching how Tarot/Spectral cards opened from a pack work. */
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

  if (item.kind === 'spectral') {
    const def = spectralCard(item.cardId)
    if (targetIds.length < def.minTargets || targetIds.length > def.maxTargets) return state
    if ((def.minTargets > 0 || def.requiresHand) && state.phase === 'blind-select') return state

    const stateWithoutItem: RunState = {
      ...state,
      consumables: state.consumables.filter((c) => c.instanceId !== instanceId),
    }
    const { state: nextState, message } = applySpectral(item.cardId as SpectralId, stateWithoutItem, targetIds)
    return { ...nextState, selectedIds: [], message }
  }

  const def = TAROT_CARDS.find((t) => t.id === item.cardId)
  if (!def) return state
  if (targetIds.length < def.minTargets || targetIds.length > def.maxTargets) return state
  if (def.minTargets > 0 && state.phase === 'blind-select') return state

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
  const value = item.kind === 'planet' ? PLANET_SELL_VALUE : item.kind === 'spectral' ? SPECTRAL_SELL_VALUE : TAROT_SELL_VALUE
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
  const cost = rerollCost(state.rerollsUsedThisShop, state.ownedVouchers)
  if (state.money < cost) return state

  const shopCtx: ShopGenContext = {
    excludeCatIds: state.ownedCats.map((c) => c.defId),
    ownedVouchers: state.ownedVouchers,
    forceBuffoonPack: false,
  }
  const shopOffers = generateShopSlots(shopCtx)

  return {
    ...state,
    money: state.money - cost,
    shopOffers,
    rerollsUsedThisShop: state.rerollsUsedThisShop + 1,
  }
}

export function leaveShop(state: RunState): RunState {
  if (state.phase !== 'shop') return state
  const ante = effectiveAnte(state.ante, state.ownedVouchers)
  const boss = state.blind === 'boss' ? currentBossBlind(state) : undefined
  return { ...state, phase: 'blind-select', target: targetScore(ante, state.blind, boss), message: null }
}
