import { CAT_ROSTER } from './cats/roster'
import { BANNER_RARITIES } from './cats/types'
import { PACK_CATEGORIES, PACK_INFO, type PackCategory } from './packs'
import { pickWeighted } from './rng'
import { editionPriceDelta, rollCatEdition, type CatEdition } from './cardMods'

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
  /** set when kind === 'cat'; the edition it'll be purchased with, if any */
  catEdition?: CatEdition
  /** set when kind === 'pack' */
  packCategory?: PackCategory
  cost: number
}

const BANNER_RARITY_WEIGHTS: Record<'rare' | 'super_rare' | 'uber', number> = {
  rare: 55,
  super_rare: 30,
  uber: 15,
}

export function rerollCost(rerollsUsedThisShop: number): number {
  return BASE_REROLL_COST + rerollsUsedThisShop
}

let slotCounter = 0
function nextSlotId(prefix: string, rng: () => number): string {
  slotCounter += 1
  return `${prefix}-${slotCounter}-${Math.floor(rng() * 1e6)}`
}

function catSlot(id: string, cost: number, rng: () => number): Pick<ShopSlot, 'catId' | 'catEdition' | 'cost'> {
  const catEdition = rollCatEdition(rng)
  return { catId: id, catEdition, cost: cost + editionPriceDelta(catEdition) }
}

/**
 * Builds the 6 shop slots: 1 Cat Capsule (Normal cats), 3 Rare Cat Banners
 * (independent draws from the Rare/Super Rare/Uber Rare pool), and 2 packs
 * that rotate between Tarot, Planet, and Spectral. Every Cat slot also rolls
 * an edition per CAT_EDITION_WEIGHTS (96% Base, 2% Foil, 1.4% Holographic,
 * 0.3% Polychrome, 0.3% Negative).
 */
export function generateShopSlots(excludeCatIds: string[], rng: () => number = Math.random): ShopSlot[] {
  const used = new Set(excludeCatIds)
  const slots: ShopSlot[] = []

  const commonPool = CAT_ROSTER.filter((c) => c.rarity === 'common' && !used.has(c.id))
  if (commonPool.length > 0) {
    const def = commonPool[Math.floor(rng() * commonPool.length)]
    slots.push({ id: nextSlotId('capsule', rng), kind: 'cat', ...catSlot(def.id, def.cost, rng) })
    used.add(def.id)
  }

  for (let i = 0; i < RARE_BANNER_COUNT; i++) {
    const pool = CAT_ROSTER.filter((c) => BANNER_RARITIES.includes(c.rarity) && !used.has(c.id))
    if (pool.length === 0) break

    const rarity = pickWeighted(BANNER_RARITY_WEIGHTS, rng)
    let rarityPool = pool.filter((c) => c.rarity === rarity)
    if (rarityPool.length === 0) rarityPool = pool

    const def = rarityPool[Math.floor(rng() * rarityPool.length)]
    slots.push({ id: nextSlotId('banner', rng), kind: 'cat', ...catSlot(def.id, def.cost, rng) })
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
