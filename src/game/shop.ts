import { CAT_ROSTER } from './cats/roster'
import type { CatDef, Rarity } from './cats/types'

export const MAX_CAT_SLOTS = 5
export const SHOP_SIZE = 3
export const BASE_REROLL_COST = 2

const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  uber: 3,
}

function pickWeightedRarity(rng: () => number): Rarity {
  const entries = Object.entries(RARITY_WEIGHTS) as [Rarity, number][]
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total
  for (const [rarity, weight] of entries) {
    if (roll < weight) return rarity
    roll -= weight
  }
  return entries[0][0]
}

export function rerollCost(rerollsUsedThisShop: number): number {
  return BASE_REROLL_COST + rerollsUsedThisShop
}

/** Picks `count` distinct cats not already owned and not repeated within this offer. */
export function generateShopOffers(
  count: number,
  excludeIds: string[],
  rng: () => number = Math.random,
): CatDef[] {
  const excluded = new Set(excludeIds)
  const offers: CatDef[] = []

  for (let i = 0; i < count; i++) {
    const available = CAT_ROSTER.filter((c) => !excluded.has(c.id))
    if (available.length === 0) break

    const rarity = pickWeightedRarity(rng)
    let pool = available.filter((c) => c.rarity === rarity)
    if (pool.length === 0) pool = available

    const chosen = pool[Math.floor(rng() * pool.length)]
    offers.push(chosen)
    excluded.add(chosen.id)
  }

  return offers
}
