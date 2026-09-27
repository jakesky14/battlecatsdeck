import type { CardEdition, Enhancement, Seal } from './cards'
import { pickWeighted } from './rng'

export type CatEdition = CardEdition | 'negative'

export const MAX_SEALS_PER_CARD = 2

export const ENHANCEMENT_LABELS: Record<Enhancement, string> = {
  bonus: 'Bonus Card',
  mult: 'Mult Card',
  wild: 'Wild Card',
  glass: 'Glass Card',
  steel: 'Steel Card',
  stone: 'Stone Card',
  gold: 'Gold Card',
  lucky: 'Lucky Card',
}

export const SEAL_LABELS: Record<Seal, string> = {
  gold: 'Gold Seal',
  red: 'Red Seal',
  blue: 'Blue Seal',
  purple: 'Purple Seal',
}

export const EDITION_LABELS: Record<CatEdition, string> = {
  foil: 'Foil',
  holographic: 'Holographic',
  polychrome: 'Polychrome',
  negative: 'Negative',
}

// -- Scoring constants --
export const BONUS_CARD_CHIPS = 30
export const MULT_CARD_MULT = 4
export const STONE_CARD_CHIPS = 50
export const GLASS_CARD_MULT_X = 2
export const GLASS_CARD_DESTROY_CHANCE = 1 / 4
export const STEEL_CARD_MULT_X = 1.5
export const LUCKY_MULT_CHANCE = 1 / 5
export const LUCKY_MULT_BONUS = 20
export const LUCKY_MONEY_CHANCE = 1 / 15
export const LUCKY_MONEY_BONUS = 20
export const GOLD_SEAL_MONEY = 3
export const GOLD_CARD_HELD_MONEY = 3
export const FOIL_CHIPS = 50
export const HOLOGRAPHIC_MULT = 10
export const POLYCHROME_MULT_X = 1.5

// -- Shop odds --
/** Odds a Cat appears for sale with each edition (sums to 100).
 *  Foil/Holographic scale by a clean 2x/4x under Hone/Glow Up, but
 *  Polychrome doesn't follow that same multiplier, so each tier is its
 *  own explicit table rather than a doubling formula. */
export const CAT_EDITION_WEIGHTS: Record<CatEdition | 'base', number> = {
  base: 96,
  foil: 2,
  holographic: 1.4,
  polychrome: 0.3,
  negative: 0.3,
}
export const CAT_EDITION_WEIGHTS_HONE: Record<CatEdition | 'base', number> = {
  base: 96,
  foil: 4,
  holographic: 2.8,
  polychrome: 0.9,
  negative: 0.3,
}
export const CAT_EDITION_WEIGHTS_GLOW_UP: Record<CatEdition | 'base', number> = {
  base: 96,
  foil: 8,
  holographic: 5.6,
  polychrome: 2.1,
  negative: 0.3,
}

/** Odds a playing card is bought with each edition (sums to 100). No Negative playing cards. */
export const CARD_EDITION_WEIGHTS: Record<CardEdition | 'base', number> = {
  base: 92,
  foil: 4,
  holographic: 2.8,
  polychrome: 1.2,
}
export const CARD_EDITION_WEIGHTS_HONE: Record<CardEdition | 'base', number> = {
  base: 92,
  foil: 8,
  holographic: 5.6,
  polychrome: 2.4,
}
export const CARD_EDITION_WEIGHTS_GLOW_UP: Record<CardEdition | 'base', number> = {
  base: 92,
  foil: 16,
  holographic: 11.2,
  polychrome: 4.8,
}

/** Foil/Holographic/Polychrome all cost/sell the same extra amount; Negative is Cat/consumable-only. */
export const EDITION_PRICE_DELTA: Record<CatEdition, number> = {
  foil: 2,
  holographic: 3,
  polychrome: 5,
  negative: 5,
}

export function editionPriceDelta(edition: CatEdition | undefined): number {
  return edition ? EDITION_PRICE_DELTA[edition] : 0
}

/** 0 = base odds, 1 = Hone, 2 = Glow Up — see `editionTier` in vouchers.ts. */
export function rollCatEdition(rng: () => number, tier: 0 | 1 | 2 = 0): CatEdition | undefined {
  const weights = tier === 2 ? CAT_EDITION_WEIGHTS_GLOW_UP : tier === 1 ? CAT_EDITION_WEIGHTS_HONE : CAT_EDITION_WEIGHTS
  const result = pickWeighted(weights, rng)
  return result === 'base' ? undefined : result
}

export function rollCardEdition(rng: () => number, tier: 0 | 1 | 2 = 0): CardEdition | undefined {
  const weights = tier === 2 ? CARD_EDITION_WEIGHTS_GLOW_UP : tier === 1 ? CARD_EDITION_WEIGHTS_HONE : CARD_EDITION_WEIGHTS
  const result = pickWeighted(weights, rng)
  return result === 'base' ? undefined : result
}

// -- Consumable sell values --
export const TAROT_SELL_VALUE = 1
export const PLANET_SELL_VALUE = 1
export const SPECTRAL_SELL_VALUE = 2
/** Negative-edition consumables can't be purchased, but sell for $5 more than usual. */
export const NEGATIVE_CONSUMABLE_SELL_BONUS = 5
