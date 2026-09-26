import type { Card, Seal } from './cards'
import { ENHANCEMENTS, FACE_RANKS, NUMBERED_RANKS, createExtraCard } from './cards'
import { CAT_ROSTER, catDef } from './cats/roster'
import { LEGENDARY_RARITIES, type OwnedCat } from './cats/types'
import { HAND_TYPES } from '../data/handTypes'
import { pick } from './rng'
import { effectiveMaxCatSlots } from './packs'
import { MAX_SEALS_PER_CARD } from './cardMods'
import type { RunState } from './runState'
import type { SpectralId } from '../data/spectrals'
import { spectralCard } from '../data/spectrals'

export interface SpectralResult {
  state: RunState
  message: string
}

function newInstanceId(prefix: string, rng: () => number): string {
  return `${prefix}-${Date.now()}-${rng().toString(36).slice(2)}`
}

/** Removes up to `count` random cards from the current hand, permanently
 *  (removed from future decks too, like the Hanged Man Tarot card). */
function destroyRandomHandCards(state: RunState, count: number, rng: () => number): RunState {
  const hand = [...state.hand]
  const destroyed: string[] = []
  for (let i = 0; i < count && hand.length > 0; i++) {
    const index = Math.floor(rng() * hand.length)
    destroyed.push(hand[index].id)
    hand.splice(index, 1)
  }
  const cardOverrides = { ...state.cardOverrides }
  for (const id of destroyed) delete cardOverrides[id]
  return {
    ...state,
    hand,
    removedCardIds: [...state.removedCardIds, ...destroyed],
    cardOverrides,
  }
}

/** Adds new cards to the deck permanently, and into the current hand if one is in play. */
function addCardsToHandAndDeck(state: RunState, cards: Card[]): RunState {
  return {
    ...state,
    extraCards: [...state.extraCards, ...cards],
    hand: [...state.hand, ...cards],
  }
}

function addSeal(state: RunState, cardId: string, seal: Seal): RunState {
  const hand = state.hand.map((c) => {
    if (c.id !== cardId) return c
    const seals = Array.from(new Set([...(c.seals ?? []), seal])).slice(-MAX_SEALS_PER_CARD)
    return { ...c, seals }
  })
  const target = hand.find((c) => c.id === cardId)
  const cardOverrides = target
    ? { ...state.cardOverrides, [cardId]: { ...state.cardOverrides[cardId], seals: target.seals } }
    : state.cardOverrides
  return { ...state, hand, cardOverrides }
}

function randomRankCards(count: number, ranks: (typeof FACE_RANKS)[number][], rng: () => number): Card[] {
  const cards: Card[] = []
  for (let i = 0; i < count; i++) {
    const rank = pick(ranks, rng)
    const enhancement = pick(ENHANCEMENTS, rng)
    cards.push(createExtraCard({ rank, enhancement }, rng))
  }
  return cards
}

function applyFamiliar(state: RunState, rng: () => number): SpectralResult {
  let next = destroyRandomHandCards(state, 1, rng)
  const added = randomRankCards(3, FACE_RANKS, rng)
  next = addCardsToHandAndDeck(next, added)
  return { state: next, message: '🐈‍⬛ Familiar destroys a card and adds 3 Enhanced face cards!' }
}

function applyGrim(state: RunState, rng: () => number): SpectralResult {
  let next = destroyRandomHandCards(state, 1, rng)
  const added = randomRankCards(2, [14], rng)
  next = addCardsToHandAndDeck(next, added)
  return { state: next, message: '💀 Grim destroys a card and adds 2 Enhanced Aces!' }
}

function applyIncantation(state: RunState, rng: () => number): SpectralResult {
  let next = destroyRandomHandCards(state, 1, rng)
  const added = randomRankCards(4, NUMBERED_RANKS, rng)
  next = addCardsToHandAndDeck(next, added)
  return { state: next, message: '🕯️ Incantation destroys a card and adds 4 Enhanced numbered cards!' }
}

function applyTalisman(state: RunState, targetIds: string[]): SpectralResult {
  const next = addSeal(state, targetIds[0], 'gold')
  return { state: next, message: '🔯 Talisman adds a Gold Seal!' }
}

function applyDejaVu(state: RunState, targetIds: string[]): SpectralResult {
  const next = addSeal(state, targetIds[0], 'red')
  return { state: next, message: '🔁 Deja Vu adds a Red Seal!' }
}

function applyTrance(state: RunState, targetIds: string[]): SpectralResult {
  const next = addSeal(state, targetIds[0], 'blue')
  return { state: next, message: '🌀 Trance adds a Blue Seal!' }
}

function applyMedium(state: RunState, targetIds: string[]): SpectralResult {
  const next = addSeal(state, targetIds[0], 'purple')
  return { state: next, message: '🔮 Medium adds a Purple Seal!' }
}

const AURA_EDITIONS: Card['edition'][] = ['foil', 'holographic', 'polychrome']

function applyAura(state: RunState, targetIds: string[], rng: () => number): SpectralResult {
  const edition = pick(AURA_EDITIONS, rng)
  const hand = state.hand.map((c) => (c.id === targetIds[0] ? { ...c, edition } : c))
  const cardOverrides = { ...state.cardOverrides, [targetIds[0]]: { ...state.cardOverrides[targetIds[0]], edition } }
  return { state: { ...state, hand, cardOverrides }, message: `🌈 Aura adds a ${edition} edition!` }
}

function applyWraith(state: RunState, rng: () => number): SpectralResult {
  const pool = CAT_ROSTER.filter((c) => c.rarity === 'rare' && !state.ownedCats.some((o) => o.defId === c.id))
  if (pool.length === 0 || state.ownedCats.length >= effectiveMaxCatSlots(state.bonusCatSlots)) {
    return { state: { ...state, money: 0 }, message: '👻 Wraith: no room for a new Cat. Money set to $0.' }
  }
  const def = pick(pool, rng)
  const instance: OwnedCat = { instanceId: newInstanceId(def.id, rng), defId: def.id, disabledThisRound: false }
  return {
    state: { ...state, ownedCats: [...state.ownedCats, instance], money: 0 },
    message: `👻 Wraith creates a ${def.name}! Money set to $0.`,
  }
}

const SUIT_LIST = ['hearts', 'diamonds', 'clubs', 'spades'] as const

function applySigil(state: RunState, rng: () => number): SpectralResult {
  const suit = pick([...SUIT_LIST], rng)
  const hand = state.hand.map((c) => ({ ...c, suit }))
  const cardOverrides = { ...state.cardOverrides }
  for (const c of state.hand) cardOverrides[c.id] = { ...cardOverrides[c.id], suit }
  return { state: { ...state, hand, cardOverrides }, message: `🔻 Sigil converts your hand to ${suit}!` }
}

function applyOuija(state: RunState, rng: () => number): SpectralResult {
  const rank = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const, rng)
  const hand = state.hand.map((c) => ({ ...c, rank }))
  const cardOverrides = { ...state.cardOverrides }
  for (const c of state.hand) cardOverrides[c.id] = { ...cardOverrides[c.id], rank }
  return {
    state: { ...state, hand, cardOverrides, bonusHandSize: state.bonusHandSize - 1 },
    message: `👁️ Ouija converts your hand to rank ${rank}! Hand size -1.`,
  }
}

function applyEctoplasm(state: RunState, rng: () => number): SpectralResult {
  const bonusHandSize = state.bonusHandSize - 1
  if (state.ownedCats.length === 0) {
    return { state: { ...state, bonusHandSize }, message: '🧪 Ectoplasm: no Cat to enchant. Hand size -1.' }
  }
  const target = pick(state.ownedCats, rng)
  const ownedCats = state.ownedCats.map((c) => (c.instanceId === target.instanceId ? { ...c, edition: 'negative' as const } : c))
  return {
    state: { ...state, ownedCats, bonusHandSize },
    message: `🧪 Ectoplasm makes ${catDef(target.defId).name} Negative! Hand size -1.`,
  }
}

function applyImmolate(state: RunState, rng: () => number): SpectralResult {
  const next = destroyRandomHandCards(state, 5, rng)
  return { state: { ...next, money: next.money + 20 }, message: '🔥 Immolate destroys 5 cards, +$20!' }
}

function applyAnkh(state: RunState, rng: () => number): SpectralResult {
  if (state.ownedCats.length === 0) {
    return { state, message: '☥ Ankh: no Cats to copy.' }
  }
  const target = pick(state.ownedCats, rng)
  const clone: OwnedCat = {
    instanceId: newInstanceId(target.defId, rng),
    defId: target.defId,
    disabledThisRound: false,
    edition: target.edition === 'negative' ? undefined : target.edition,
  }
  return {
    state: { ...state, ownedCats: [clone] },
    message: `☥ Ankh copies ${catDef(target.defId).name}, destroying all others!`,
  }
}

function applyHex(state: RunState, rng: () => number): SpectralResult {
  if (state.ownedCats.length === 0) {
    return { state, message: '✳️ Hex: no Cats to enchant.' }
  }
  const target = pick(state.ownedCats, rng)
  const enchanted: OwnedCat = { ...target, edition: 'polychrome' }
  return {
    state: { ...state, ownedCats: [enchanted] },
    message: `✳️ Hex makes ${catDef(target.defId).name} Polychrome, destroying all others!`,
  }
}

function applyCryptid(state: RunState, targetIds: string[], rng: () => number): SpectralResult {
  const source = state.hand.find((c) => c.id === targetIds[0])
  if (!source) return { state, message: '🐾 Cryptid: card not found.' }
  const copies = [
    createExtraCard({ rank: source.rank, suit: source.suit, enhancement: source.enhancement, seals: source.seals ? [...source.seals] : undefined, edition: source.edition }, rng),
    createExtraCard({ rank: source.rank, suit: source.suit, enhancement: source.enhancement, seals: source.seals ? [...source.seals] : undefined, edition: source.edition }, rng),
  ]
  return { state: addCardsToHandAndDeck(state, copies), message: '🐾 Cryptid creates 2 copies of your card!' }
}

function applySoul(state: RunState, rng: () => number): SpectralResult {
  const pool = CAT_ROSTER.filter((c) => LEGENDARY_RARITIES.includes(c.rarity) && !state.ownedCats.some((o) => o.defId === c.id))
  if (pool.length === 0 || state.ownedCats.length >= effectiveMaxCatSlots(state.bonusCatSlots)) {
    return { state, message: '✨ The Soul: no room for a Legendary Cat.' }
  }
  const def = pick(pool, rng)
  const instance: OwnedCat = { instanceId: newInstanceId(def.id, rng), defId: def.id, disabledThisRound: false }
  return { state: { ...state, ownedCats: [...state.ownedCats, instance] }, message: `✨ The Soul creates ${def.name}!` }
}

function applyBlackHole(state: RunState): SpectralResult {
  const handLevels = { ...state.handLevels }
  for (const h of HAND_TYPES) handLevels[h.id] = (handLevels[h.id] ?? 1) + 1
  return { state: { ...state, handLevels }, message: '🕳️ Black Hole: every poker hand leveled up!' }
}

export function applySpectral(
  id: SpectralId,
  state: RunState,
  targetIds: string[],
  rng: () => number = Math.random,
): SpectralResult {
  switch (id) {
    case 'familiar':
      return applyFamiliar(state, rng)
    case 'grim':
      return applyGrim(state, rng)
    case 'incantation':
      return applyIncantation(state, rng)
    case 'talisman':
      return applyTalisman(state, targetIds)
    case 'aura':
      return applyAura(state, targetIds, rng)
    case 'wraith':
      return applyWraith(state, rng)
    case 'sigil':
      return applySigil(state, rng)
    case 'ouija':
      return applyOuija(state, rng)
    case 'ectoplasm':
      return applyEctoplasm(state, rng)
    case 'immolate':
      return applyImmolate(state, rng)
    case 'ankh':
      return applyAnkh(state, rng)
    case 'deja_vu':
      return applyDejaVu(state, targetIds)
    case 'hex':
      return applyHex(state, rng)
    case 'trance':
      return applyTrance(state, targetIds)
    case 'medium':
      return applyMedium(state, targetIds)
    case 'cryptid':
      return applyCryptid(state, targetIds, rng)
    case 'soul':
      return applySoul(state, rng)
    case 'black_hole':
      return applyBlackHole(state)
  }
}

/** Whether this Spectral card can currently be used, given the run's phase. */
export function spectralUsableInPhase(id: SpectralId, phase: RunState['phase']): boolean {
  const def = spectralCard(id)
  if (def.minTargets > 0 || def.requiresHand) return phase === 'playing' || phase === 'shop'
  return phase === 'blind-select' || phase === 'playing' || phase === 'shop'
}
