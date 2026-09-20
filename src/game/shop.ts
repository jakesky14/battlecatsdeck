import { CAT_ROSTER } from './cats/roster'
import { BANNER_RARITIES } from './cats/types'
import { PACK_CATEGORIES, PACK_INFO, type PackCategory } from './packs'

export const MAX_CAT_SLOTS = 5
export const BASE_REROLL_COST = 2
export const RARE_BANNER_COUNT = 3
export const PACK_SLOT_COUNT = 2

export type ShopSlotKind = 'cat' | 'pack'

export interface ShopSlot {
  id: string
  kind: ShopSlotKind
  /** set when kind === 'cat' */
  catId?: string
  /** set when kind === 'pack' */
  packCategory?: PackCategory
  cost: number
}

const BANNER_RARITY_WEIGHTS: Record<'rare' | 'super_rare' | 'uber', number> = {
  rare: 55,
  super_rare: 30,
  uber: 15,
}

function pickWeighted<T extends string>(weights: Record<T, number>, rng: () => number): T {
  const entries = Object.entries(weights) as [T, number][]
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total
  for (const [key, weight] of entries) {
    if (roll < weight) return key
    roll -= weight
  }
  return entries[0][0]
}

export function rerollCost(rerollsUsedThisShop: number): number {
  return BASE_REROLL_COST + rerollsUsedThisShop
}

let slotCounter = 0
function nextSlotId(prefix: string, rng: () => number): string {
  slotCounter += 1
  return `${prefix}-${slotCounter}-${Math.floor(rng() * 1e6)}`
}

/**
 * Builds the 6 shop slots: 1 Cat Capsule (Normal cats), 3 Rare Cat Banners
 * (independent draws from the Rare/Super Rare/Uber Rare pool), and 2 packs
 * that rotate between Tarot, Planet, and Spectral.
 */
export function generateShopSlots(excludeCatIds: string[], rng: () => number = Math.random): ShopSlot[] {
  const used = new Set(excludeCatIds)
  const slots: ShopSlot[] = []

  const commonPool = CAT_ROSTER.filter((c) => c.rarity === 'common' && !used.has(c.id))
  if (commonPool.length > 0) {
    const def = commonPool[Math.floor(rng() * commonPool.length)]
    slots.push({ id: nextSlotId('capsule', rng), kind: 'cat', catId: def.id, cost: def.cost })
    used.add(def.id)
  }

  for (let i = 0; i < RARE_BANNER_COUNT; i++) {
    const pool = CAT_ROSTER.filter((c) => BANNER_RARITIES.includes(c.rarity) && !used.has(c.id))
    if (pool.length === 0) break

    const rarity = pickWeighted(BANNER_RARITY_WEIGHTS, rng)
    let rarityPool = pool.filter((c) => c.rarity === rarity)
    if (rarityPool.length === 0) rarityPool = pool

    const def = rarityPool[Math.floor(rng() * rarityPool.length)]
    slots.push({ id: nextSlotId('banner', rng), kind: 'cat', catId: def.id, cost: def.cost })
    used.add(def.id)
  }

  for (let i = 0; i < PACK_SLOT_COUNT; i++) {
    const category = PACK_CATEGORIES[Math.floor(rng() * PACK_CATEGORIES.length)]
    slots.push({
      id: nextSlotId('pack', rng),
      kind: 'pack',
      packCategory: category,
      cost: PACK_INFO[category].cost,
    })
  }

  return slots
}
