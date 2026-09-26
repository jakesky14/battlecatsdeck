import { CAT_ROSTER, catDef } from './cats/roster'
import { CAT_RARITY_WEIGHTS, ownedCatSlotCount, type OwnedCat } from './cats/types'
import type { Card } from './cards'
import { RANKS, SUITS, createExtraCard, rankLabel, suitSymbol } from './cards'
import { HAND_TYPES, handTypeDef, type HandTypeId } from '../data/handTypes'
import { PLANET_CARDS, planetCard, planetForHandType } from '../data/planets'
import { TAROT_CARDS, type TarotId } from '../data/tarots'
import { SPECTRAL_CARDS, type SpectralId } from '../data/spectrals'
import { applyTarot } from './tarot'
import { applySpectral } from './spectral'
import { rollCardEdition } from './cardMods'
import { pick, pickWeighted } from './rng'
import { MAX_CAT_SLOTS } from './shop'
import type { RunState } from './runState'

export type PackCategory = 'arcana' | 'celestial' | 'spectral' | 'standard' | 'buffoon'
export type PackSize = 'normal' | 'jumbo' | 'mega'

export const PACK_CATEGORIES: PackCategory[] = ['arcana', 'celestial', 'spectral', 'standard', 'buffoon']
export const PACK_SIZES: PackSize[] = ['normal', 'jumbo', 'mega']

export const PACK_SIZE_COST: Record<PackSize, number> = { normal: 4, jumbo: 6, mega: 8 }

export interface PackContentSpec {
  count: number
  choose: number
}

export const PACK_CONTENTS: Record<PackCategory, Record<PackSize, PackContentSpec>> = {
  arcana: { normal: { count: 3, choose: 1 }, jumbo: { count: 5, choose: 1 }, mega: { count: 5, choose: 2 } },
  celestial: { normal: { count: 3, choose: 1 }, jumbo: { count: 5, choose: 1 }, mega: { count: 5, choose: 2 } },
  spectral: { normal: { count: 2, choose: 1 }, jumbo: { count: 4, choose: 1 }, mega: { count: 4, choose: 2 } },
  standard: { normal: { count: 3, choose: 1 }, jumbo: { count: 5, choose: 1 }, mega: { count: 5, choose: 2 } },
  buffoon: { normal: { count: 2, choose: 1 }, jumbo: { count: 4, choose: 1 }, mega: { count: 5, choose: 2 } },
}

export const PACK_LABELS: Record<PackCategory, { label: string; icon: string; description: string }> = {
  arcana: { label: 'Arcana Pack', icon: '🔮', description: 'Choose Tarot card(s) to use instantly.' },
  celestial: { label: 'Celestial Pack', icon: '🪐', description: 'Choose Planet card(s) to use instantly.' },
  spectral: { label: 'Spectral Pack', icon: '👻', description: 'Choose Spectral card(s) to use instantly.' },
  standard: { label: 'Standard Pack', icon: '🃏', description: 'Choose playing card(s) to add to your deck.' },
  buffoon: { label: 'Buffoon Pack', icon: '🎪', description: 'Choose Cat(s) to recruit.' },
}

const SIZE_LABEL: Record<PackSize, string> = { normal: '', jumbo: 'Jumbo ', mega: 'Mega ' }

export function packLabel(category: PackCategory, size: PackSize): string {
  return `${SIZE_LABEL[size]}${PACK_LABELS[category].label}`
}

/** The 15 pack variants (5 categories x 3 sizes) and their odds of appearing
 *  in a pack shop slot. Sums to 100. */
export const PACK_VARIANT_WEIGHTS: Record<string, number> = {
  'standard:normal': 17.84,
  'arcana:normal': 17.84,
  'celestial:normal': 17.84,
  'buffoon:normal': 5.35,
  'spectral:normal': 2.68,
  'standard:jumbo': 8.92,
  'arcana:jumbo': 8.92,
  'celestial:jumbo': 8.92,
  'buffoon:jumbo': 2.68,
  'spectral:jumbo': 1.34,
  'standard:mega': 2.23,
  'arcana:mega': 2.23,
  'celestial:mega': 2.23,
  'spectral:mega': 0.31,
  'buffoon:mega': 0.67,
}

export function rollPackVariant(rng: () => number): { category: PackCategory; size: PackSize } {
  const key = pickWeighted(PACK_VARIANT_WEIGHTS, rng)
  const [category, size] = key.split(':') as [PackCategory, PackSize]
  return { category, size }
}

export function effectiveMaxCatSlots(bonusCatSlots: number): number {
  return MAX_CAT_SLOTS + bonusCatSlots
}

export type PackOption =
  | { kind: 'tarot'; id: TarotId }
  | { kind: 'planet'; id: string }
  | { kind: 'spectral'; id: SpectralId }
  | { kind: 'playing_card'; card: Card }
  | { kind: 'joker'; id: string }

export interface PackOptionEntry {
  optionId: string
  option: PackOption
}

export interface PackGenContext {
  excludeCatIds: string[]
  handTypePlayCounts: Record<HandTypeId, number>
  hasTelescope: boolean
  hasHone: boolean
}

function mostPlayedHandType(counts: Record<HandTypeId, number>): HandTypeId {
  let best: HandTypeId = HAND_TYPES[0].id
  let bestCount = -1
  for (const h of HAND_TYPES) {
    const count = counts[h.id] ?? 0
    if (count > bestCount) {
      bestCount = count
      best = h.id
    }
  }
  return best
}

function rollJokerId(excludeIds: Set<string>, rng: () => number): string | null {
  const rarity = pickWeighted(CAT_RARITY_WEIGHTS, rng)
  let pool = CAT_ROSTER.filter((c) => c.rarity === rarity && !excludeIds.has(c.id))
  if (pool.length === 0) {
    pool = CAT_ROSTER.filter((c) => c.rarity in CAT_RARITY_WEIGHTS && !excludeIds.has(c.id))
  }
  if (pool.length === 0) return null
  return pick(pool, rng).id
}

export function generatePackOptions(
  category: PackCategory,
  size: PackSize,
  ctx: PackGenContext,
  rng: () => number = Math.random,
): PackOptionEntry[] {
  const { count } = PACK_CONTENTS[category][size]

  if (category === 'arcana') {
    return Array.from({ length: count }, (_, i) => ({
      optionId: `t${i}`,
      option: { kind: 'tarot', id: pick(TAROT_CARDS, rng).id },
    }))
  }

  if (category === 'celestial') {
    const entries: PackOptionEntry[] = Array.from({ length: count }, (_, i) => ({
      optionId: `p${i}`,
      option: { kind: 'planet', id: pick(PLANET_CARDS, rng).id } as PackOption,
    }))
    if (ctx.hasTelescope && entries.length > 0) {
      const planet = planetForHandType(mostPlayedHandType(ctx.handTypePlayCounts))
      if (planet) entries[0] = { optionId: entries[0].optionId, option: { kind: 'planet', id: planet.id } }
    }
    return entries
  }

  if (category === 'spectral') {
    return Array.from({ length: count }, (_, i) => ({
      optionId: `s${i}`,
      option: { kind: 'spectral', id: pick(SPECTRAL_CARDS, rng).id },
    }))
  }

  if (category === 'standard') {
    return Array.from({ length: count }, (_, i) => {
      const card = createExtraCard(
        { suit: pick(SUITS, rng), rank: pick(RANKS, rng), edition: rollCardEdition(rng, ctx.hasHone) },
        rng,
      )
      return { optionId: `c${i}`, option: { kind: 'playing_card', card } }
    })
  }

  // buffoon
  const used = new Set(ctx.excludeCatIds)
  const entries: PackOptionEntry[] = []
  for (let i = 0; i < count; i++) {
    const id = rollJokerId(used, rng)
    if (!id) break
    entries.push({ optionId: `j${i}`, option: { kind: 'joker', id } })
    used.add(id)
  }
  return entries
}

let resolveCounter = 0
function newId(prefix: string): string {
  resolveCounter += 1
  return `${prefix}-${Date.now()}-${resolveCounter}`
}

export interface PackChoiceResult {
  state: RunState
  message: string
}

/** Applies a single chosen pack option. `targetIds` are hand cards selected by
 *  the player, needed only for Tarot/Spectral options with minTargets > 0. */
export function resolvePackOption(
  option: PackOption,
  state: RunState,
  targetIds: string[],
  rng: () => number = Math.random,
): PackChoiceResult {
  if (option.kind === 'tarot') {
    const { state: next, message } = applyTarot(option.id, state, targetIds, rng)
    return { state: next, message }
  }

  if (option.kind === 'planet') {
    const planet = planetCard(option.id)
    const newLevel = (state.handLevels[planet.handType] ?? 1) + 1
    const handLevels = { ...state.handLevels, [planet.handType]: newLevel }
    return {
      state: { ...state, handLevels, lastConsumableUsed: { kind: 'planet', id: planet.id } },
      message: `${planet.icon} ${planet.name}: ${handTypeDef(planet.handType).label} leveled up to Lv.${newLevel}!`,
    }
  }

  if (option.kind === 'spectral') {
    const { state: next, message } = applySpectral(option.id, state, targetIds, rng)
    return { state: next, message }
  }

  if (option.kind === 'playing_card') {
    return {
      state: { ...state, extraCards: [...state.extraCards, option.card] },
      message: `Added ${rankLabel(option.card.rank)}${suitSymbol(option.card.suit)} to your deck!`,
    }
  }

  // joker
  if (ownedCatSlotCount(state.ownedCats) >= effectiveMaxCatSlots(state.bonusCatSlots)) {
    return { state, message: 'No room for a new Cat.' }
  }
  const instance: OwnedCat = { instanceId: newId(option.id), defId: option.id, disabledThisRound: false }
  return {
    state: { ...state, ownedCats: [...state.ownedCats, instance] },
    message: `Recruited a ${catDef(option.id).name}!`,
  }
}
