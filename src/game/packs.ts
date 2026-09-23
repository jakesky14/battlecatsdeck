import { createDeck, rankLabel, suitSymbol } from './cards'
import { CAT_ROSTER, catDef } from './cats/roster'
import { BANNER_RARITIES, type OwnedCat } from './cats/types'
import { HAND_TYPES, handTypeDef } from '../data/handTypes'
import { PLANET_CARDS } from '../data/planets'
import { MAX_CAT_SLOTS } from './shop'
import type { RunState } from './runState'

export type PackCategory = 'tarot' | 'planet' | 'spectral'

export interface PackInfo {
  label: string
  icon: string
  cost: number
  description: string
}

export const PACK_INFO: Record<PackCategory, PackInfo> = {
  tarot: {
    label: 'Tarot Pack',
    icon: '🔮',
    cost: 4,
    description: 'A random boon: money, a permanent hand/discard/Cat-slot bonus, or a removed card.',
  },
  planet: {
    label: 'Planet Pack',
    icon: '🪐',
    cost: 5,
    description: 'Levels up a random poker hand, permanently boosting its Chips and Mult.',
  },
  spectral: {
    label: 'Spectral Pack',
    icon: '👻',
    cost: 7,
    description: 'A rarer, more powerful boon — duplicate a Cat, get one free, or level every hand.',
  },
}

export const PACK_CATEGORIES: PackCategory[] = ['tarot', 'planet', 'spectral']

export interface PackResult {
  state: RunState
  message: string
}

export function effectiveMaxCatSlots(bonusCatSlots: number): number {
  return MAX_CAT_SLOTS + bonusCatSlots
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function applyPlanet(state: RunState, rng: () => number): PackResult {
  const planet = pick(PLANET_CARDS, rng)
  const newLevel = (state.handLevels[planet.handType] ?? 1) + 1
  const handLevels = { ...state.handLevels, [planet.handType]: newLevel }
  return {
    state: { ...state, handLevels },
    message: `${planet.icon} ${planet.name}: ${handTypeDef(planet.handType).label} leveled up to Lv.${newLevel}!`,
  }
}

type TarotChoice = 'money' | 'hand' | 'discard' | 'slot' | 'remove'

function applyTarot(state: RunState, rng: () => number): PackResult {
  const choice = pick<TarotChoice>(['money', 'hand', 'discard', 'slot', 'remove'], rng)

  switch (choice) {
    case 'money':
      return { state: { ...state, money: state.money + 8 }, message: '🔮 Tarot Card: +$8!' }
    case 'hand':
      return {
        state: { ...state, bonusHandsPerRound: state.bonusHandsPerRound + 1 },
        message: '🔮 Tarot Card: +1 hand per round for the rest of the run!',
      }
    case 'discard':
      return {
        state: { ...state, bonusDiscardsPerRound: state.bonusDiscardsPerRound + 1 },
        message: '🔮 Tarot Card: +1 discard per round for the rest of the run!',
      }
    case 'slot':
      return {
        state: { ...state, bonusCatSlots: state.bonusCatSlots + 1 },
        message: '🔮 Tarot Card: +1 Cat slot for the rest of the run!',
      }
    case 'remove': {
      const removed = new Set(state.removedCardIds)
      const pool = createDeck().filter((c) => !removed.has(c.id))
      if (pool.length === 0) {
        return { state: { ...state, money: state.money + 8 }, message: '🔮 Tarot Card: +$8!' }
      }
      const card = pick(pool, rng)
      return {
        state: { ...state, removedCardIds: [...state.removedCardIds, card.id] },
        message: `🔮 Tarot Card: Removed the ${rankLabel(card.rank)}${suitSymbol(card.suit)} from your deck!`,
      }
    }
  }
}

type SpectralChoice = 'duplicate' | 'free_cat' | 'level_all' | 'double_money'

function applySpectral(state: RunState, rng: () => number): PackResult {
  const slotsAvailable = state.ownedCats.length < effectiveMaxCatSlots(state.bonusCatSlots)
  const bannerPool = CAT_ROSTER.filter(
    (c) => BANNER_RARITIES.includes(c.rarity) && !state.ownedCats.some((o) => o.defId === c.id),
  )

  let choices: SpectralChoice[] = ['duplicate', 'free_cat', 'level_all', 'double_money']
  if (!slotsAvailable || state.ownedCats.length === 0) choices = choices.filter((c) => c !== 'duplicate')
  if (!slotsAvailable || bannerPool.length === 0) choices = choices.filter((c) => c !== 'free_cat')

  const choice = pick(choices, rng)

  switch (choice) {
    case 'duplicate': {
      const target = pick(state.ownedCats, rng)
      const clone: OwnedCat = {
        instanceId: `${target.defId}-${Date.now()}-${rng().toString(36).slice(2)}`,
        defId: target.defId,
        disabledThisRound: false,
      }
      return {
        state: { ...state, ownedCats: [...state.ownedCats, clone] },
        message: `👻 Spectral Card: Duplicated your ${catDef(target.defId).name}!`,
      }
    }
    case 'free_cat': {
      const def = pick(bannerPool, rng)
      const instance: OwnedCat = {
        instanceId: `${def.id}-${Date.now()}-${rng().toString(36).slice(2)}`,
        defId: def.id,
        disabledThisRound: false,
      }
      return {
        state: { ...state, ownedCats: [...state.ownedCats, instance] },
        message: `👻 Spectral Card: Recruited a free ${def.name}!`,
      }
    }
    case 'level_all': {
      const handLevels = { ...state.handLevels }
      for (const h of HAND_TYPES) handLevels[h.id] = (handLevels[h.id] ?? 1) + 1
      return { state: { ...state, handLevels }, message: '👻 Spectral Card: Every poker hand leveled up!' }
    }
    case 'double_money': {
      const gain = Math.min(state.money, 20)
      return {
        state: { ...state, money: state.money + gain },
        message: `👻 Spectral Card: Doubled your money! (+$${gain})`,
      }
    }
  }
}

export function openPack(category: PackCategory, state: RunState, rng: () => number = Math.random): PackResult {
  if (category === 'planet') return applyPlanet(state, rng)
  if (category === 'tarot') return applyTarot(state, rng)
  return applySpectral(state, rng)
}
