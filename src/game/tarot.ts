import type { Card, Rank, Suit } from './cards'
import { rankLabel, suitSymbol } from './cards'
import { CAT_ROSTER, catDef } from './cats/roster'
import type { OwnedCat } from './cats/types'
import { handTypeDef } from '../data/handTypes'
import { PLANET_CARDS, planetCard } from '../data/planets'
import { TAROT_CARDS, tarotCard, type TarotId } from '../data/tarots'
import { pick } from './rng'
import { effectiveMaxCatSlots } from './packs'
import { MAX_CONSUMABLE_SLOTS, type ConsumableItem } from './consumables'
import type { RunState } from './runState'

export interface TarotResult {
  state: RunState
  message: string
}

function newConsumableId(cardId: string, rng: () => number): string {
  return `${cardId}-${Date.now()}-${rng().toString(36).slice(2)}`
}

function nextRank(rank: Rank): Rank {
  return rank === 14 ? 2 : ((rank + 1) as Rank)
}

/** Applies a rank/suit change to a card in hand, and records it as a permanent
 *  override so the change survives into future rounds' freshly-dealt decks. */
function applyCardOverride(state: RunState, cardId: string, patch: Partial<Pick<Card, 'rank' | 'suit'>>): RunState {
  const hand = state.hand.map((c) => (c.id === cardId ? { ...c, ...patch } : c))
  const cardOverrides = {
    ...state.cardOverrides,
    [cardId]: { ...state.cardOverrides[cardId], ...patch },
  }
  return { ...state, hand, cardOverrides }
}

function applyFool(state: RunState, rng: () => number): TarotResult {
  const last = state.lastConsumableUsed
  if (!last) {
    return { state, message: '🎭 The Fool: nothing to copy yet.' }
  }

  if (last.kind === 'planet') {
    const planet = planetCard(last.id)
    const newLevel = (state.handLevels[planet.handType] ?? 1) + 1
    const handLevels = { ...state.handLevels, [planet.handType]: newLevel }
    return {
      state: { ...state, handLevels },
      message: `🎭 The Fool copies ${planet.icon} ${planet.name}: ${handTypeDef(planet.handType).label} leveled up to Lv.${newLevel}!`,
    }
  }

  const def = tarotCard(last.id)
  if (state.consumables.length >= MAX_CONSUMABLE_SLOTS) {
    return { state, message: `🎭 The Fool: no room to copy ${def.name}.` }
  }
  const item: ConsumableItem = { instanceId: newConsumableId(def.id, rng), kind: 'tarot', cardId: def.id }
  return {
    state: { ...state, consumables: [...state.consumables, item] },
    message: `🎭 The Fool copies ${def.icon} ${def.name}!`,
  }
}

function applyHighPriestess(state: RunState, rng: () => number): TarotResult {
  let handLevels = { ...state.handLevels }
  const names: string[] = []
  for (let i = 0; i < 2; i++) {
    const planet = pick(PLANET_CARDS, rng)
    const newLevel = (handLevels[planet.handType] ?? 1) + 1
    handLevels = { ...handLevels, [planet.handType]: newLevel }
    names.push(`${planet.icon} ${planet.name}`)
  }
  return {
    state: { ...state, handLevels },
    message: `🌙 The High Priestess creates ${names.join(' & ')}!`,
  }
}

function applyEmperor(state: RunState, rng: () => number): TarotResult {
  let consumables = [...state.consumables]
  const created: string[] = []
  for (let i = 0; i < 2; i++) {
    if (consumables.length >= MAX_CONSUMABLE_SLOTS) break
    const def = pick(TAROT_CARDS, rng)
    consumables = [...consumables, { instanceId: newConsumableId(def.id, rng), kind: 'tarot', cardId: def.id }]
    created.push(`${def.icon} ${def.name}`)
  }
  if (created.length === 0) {
    return { state, message: '🤴 The Emperor: no room for new Tarot cards.' }
  }
  return { state: { ...state, consumables }, message: `🤴 The Emperor creates ${created.join(' & ')}!` }
}

function applyHermit(state: RunState): TarotResult {
  const gain = Math.min(state.money, 20)
  return { state: { ...state, money: state.money + gain }, message: `🕯️ The Hermit doubles your money! (+$${gain})` }
}

function applyStrength(state: RunState, targetIds: string[]): TarotResult {
  let next = state
  for (const id of targetIds) {
    const card = next.hand.find((c) => c.id === id)
    if (!card) continue
    next = applyCardOverride(next, id, { rank: nextRank(card.rank) })
  }
  return { state: next, message: `💪 Strength increases the rank of ${targetIds.length} card(s)!` }
}

function applyHangedMan(state: RunState, targetIds: string[]): TarotResult {
  const targets = new Set(targetIds)
  const hand = state.hand.filter((c) => !targets.has(c.id))
  const removedCardIds = [...state.removedCardIds, ...targetIds]
  const cardOverrides = { ...state.cardOverrides }
  for (const id of targetIds) delete cardOverrides[id]
  return {
    state: { ...state, hand, removedCardIds, cardOverrides },
    message: `🙃 The Hanged Man destroys ${targetIds.length} card(s)!`,
  }
}

function applyDeath(state: RunState, targetIds: string[]): TarotResult {
  const positions = state.hand
    .map((c, i) => ({ card: c, index: i }))
    .filter((entry) => targetIds.includes(entry.card.id))
    .sort((a, b) => a.index - b.index)

  if (positions.length !== 2) {
    return { state, message: '💀 Death needs exactly 2 selected cards.' }
  }

  const [left, right] = positions
  const next = applyCardOverride(state, left.card.id, { rank: right.card.rank, suit: right.card.suit })
  return {
    state: next,
    message: `💀 Death converts your card into a copy of the ${rankLabel(right.card.rank)}${suitSymbol(right.card.suit)}!`,
  }
}

function applyTemperance(state: RunState): TarotResult {
  const total = state.ownedCats.reduce((sum, c) => sum + catDef(c.defId).sellValue, 0)
  const gain = Math.min(50, total)
  return {
    state: { ...state, money: state.money + gain },
    message: `⚖️ Temperance gives you the sell value of your Cats! (+$${gain})`,
  }
}

function applySuitConversion(state: RunState, targetIds: string[], suit: Suit, label: string): TarotResult {
  let next = state
  for (const id of targetIds) {
    next = applyCardOverride(next, id, { suit })
  }
  return { state: next, message: `${label} converts ${targetIds.length} card(s) to ${suitSymbol(suit)}!` }
}

function applyJudgement(state: RunState, rng: () => number): TarotResult {
  const maxSlots = effectiveMaxCatSlots(state.bonusCatSlots)
  if (state.ownedCats.length >= maxSlots) {
    return { state, message: '⚡ Judgement: no room for a new Cat.' }
  }
  const pool = CAT_ROSTER.filter((c) => !state.ownedCats.some((o) => o.defId === c.id))
  if (pool.length === 0) {
    return { state, message: '⚡ Judgement: no Cats left to create.' }
  }
  const def = pick(pool, rng)
  const instance: OwnedCat = {
    instanceId: newConsumableId(def.id, rng),
    defId: def.id,
    disabledThisRound: false,
  }
  return {
    state: { ...state, ownedCats: [...state.ownedCats, instance] },
    message: `⚡ Judgement creates a ${def.name}!`,
  }
}

function applyRest(id: Exclude<TarotId, 'fool'>, state: RunState, targetIds: string[], rng: () => number): TarotResult {
  switch (id) {
    case 'high_priestess':
      return applyHighPriestess(state, rng)
    case 'emperor':
      return applyEmperor(state, rng)
    case 'hermit':
      return applyHermit(state)
    case 'strength':
      return applyStrength(state, targetIds)
    case 'hanged_man':
      return applyHangedMan(state, targetIds)
    case 'death':
      return applyDeath(state, targetIds)
    case 'temperance':
      return applyTemperance(state)
    case 'star':
      return applySuitConversion(state, targetIds, 'diamonds', '⭐ The Star')
    case 'moon':
      return applySuitConversion(state, targetIds, 'clubs', '🌕 The Moon')
    case 'sun':
      return applySuitConversion(state, targetIds, 'hearts', '☀️ The Sun')
    case 'world':
      return applySuitConversion(state, targetIds, 'spades', '🌍 The World')
    case 'judgement':
      return applyJudgement(state, rng)
  }
}

export function applyTarot(
  id: TarotId,
  state: RunState,
  targetIds: string[],
  rng: () => number = Math.random,
): TarotResult {
  if (id === 'fool') return applyFool(state, rng)
  const { state: nextState, message } = applyRest(id, state, targetIds, rng)
  return { state: { ...nextState, lastConsumableUsed: { kind: 'tarot', id } }, message }
}
