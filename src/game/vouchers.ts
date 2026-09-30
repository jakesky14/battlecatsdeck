import type { OwnedCat } from './cats/types'
import type { CatEdition } from './cardMods'

export type VoucherId =
  | 'overstock'
  | 'overstock_plus'
  | 'clearance_sale'
  | 'liquidation'
  | 'hone'
  | 'glow_up'
  | 'reroll_surplus'
  | 'reroll_glut'
  | 'crystal_ball'
  | 'omen_globe'
  | 'telescope'
  | 'observatory'
  | 'grabber'
  | 'nacho_tong'
  | 'wasteful'
  | 'recyclomancy'
  | 'tarot_merchant'
  | 'tarot_tycoon'
  | 'planet_merchant'
  | 'planet_tycoon'
  | 'seed_money'
  | 'money_tree'
  | 'blenk'
  | 'antimatter'
  | 'magic_trick'
  | 'illusion'
  | 'hieroglyph'
  | 'petroglyph'
  | 'directors_cut'
  | 'retcon'
  | 'paint_brush'
  | 'palette'

export interface VoucherDef {
  id: VoucherId
  name: string
  icon: string
  description: string
  cost: number
  /** The base voucher this upgrades, if any — must be owned before this can ever appear in the shop. */
  upgradeOf?: VoucherId
}

/** All vouchers cost the same to keep the shop's pricing predictable —
 *  no price was specified, so this follows the genre's usual flat voucher cost. */
export const VOUCHER_COST = 10

export const VOUCHERS: VoucherDef[] = [
  {
    id: 'overstock',
    name: 'Overstock',
    icon: '📦',
    description: '+1 single card slot in the shop (3 instead of 2).',
    cost: VOUCHER_COST,
  },
  {
    id: 'overstock_plus',
    name: 'Overstock Plus',
    icon: '📦',
    description:
      "+1 more single card slot, stacking with Overstock. Unlocks after spending $2,500 at the shop (lifetime, across runs).",
    cost: VOUCHER_COST,
    upgradeOf: 'overstock',
  },
  {
    id: 'clearance_sale',
    name: 'Clearance Sale',
    icon: '🏷️',
    description: 'All cards and packs in the shop are 25% off, rounded down.',
    cost: VOUCHER_COST,
  },
  {
    id: 'liquidation',
    name: 'Liquidation',
    icon: '💸',
    description:
      "All cards and packs in the shop are 50% off, rounded down (replaces Clearance Sale's rate). Unlocks by redeeming 10 vouchers in one run.",
    cost: VOUCHER_COST,
    upgradeOf: 'clearance_sale',
  },
  {
    id: 'hone',
    name: 'Hone',
    icon: '🔧',
    description: 'Foil, Holographic, and Polychrome cards appear 2x more often.',
    cost: VOUCHER_COST,
  },
  {
    id: 'glow_up',
    name: 'Glow Up',
    icon: '✨',
    description:
      "Foil, Holographic, and Polychrome cards appear 4x more often (replaces Hone's rate). Unlocks by holding 5 Foil/Holographic/Polychrome/Negative Cats at once, in one run.",
    cost: VOUCHER_COST,
    upgradeOf: 'hone',
  },
  {
    id: 'reroll_surplus',
    name: 'Reroll Surplus',
    icon: '🔄',
    description: 'Rerolls cost $2 less.',
    cost: VOUCHER_COST,
  },
  {
    id: 'reroll_glut',
    name: 'Reroll Glut',
    icon: '🔃',
    description: 'Rerolls cost an additional $2 less, stacking with Reroll Surplus. Unlocks after 100 rerolls (lifetime).',
    cost: VOUCHER_COST,
    upgradeOf: 'reroll_surplus',
  },
  {
    id: 'crystal_ball',
    name: 'Crystal Ball',
    icon: '🔮',
    description: '+1 consumable slot.',
    cost: VOUCHER_COST,
  },
  {
    id: 'omen_globe',
    name: 'Omen Globe',
    icon: '🌫️',
    description:
      'Spectral cards may appear in Arcana Packs. Unlocks after using 25 Tarot cards from Booster Packs (lifetime).',
    cost: VOUCHER_COST,
    upgradeOf: 'crystal_ball',
  },
  {
    id: 'telescope',
    name: 'Telescope',
    icon: '🔭',
    description: 'Celestial Packs always contain the Planet card for your most-played poker hand.',
    cost: VOUCHER_COST,
  },
  {
    id: 'observatory',
    name: 'Observatory',
    icon: '🛰️',
    description:
      'Held Planet cards give x1.5 Mult for their poker hand when played. Unlocks after using 25 Planet cards from Celestial Packs (lifetime).',
    cost: VOUCHER_COST,
    upgradeOf: 'telescope',
  },
  {
    id: 'grabber',
    name: 'Grabber',
    icon: '🤲',
    description: 'Permanently gain +1 hand per round.',
    cost: VOUCHER_COST,
  },
  {
    id: 'nacho_tong',
    name: 'Nacho Tong',
    icon: '🧀',
    description: 'Permanently gain another +1 hand per round, stacking with Grabber. Unlocks after playing 2,500 cards (lifetime).',
    cost: VOUCHER_COST,
    upgradeOf: 'grabber',
  },
  {
    id: 'wasteful',
    name: 'Wasteful',
    icon: '🗑️',
    description: 'Permanently gain +1 discard per round.',
    cost: VOUCHER_COST,
  },
  {
    id: 'recyclomancy',
    name: 'Recyclomancy',
    icon: '♻️',
    description:
      'Permanently gain another +1 discard per round, stacking with Wasteful. Unlocks after discarding 2,500 cards (lifetime).',
    cost: VOUCHER_COST,
    upgradeOf: 'wasteful',
  },
  {
    id: 'tarot_merchant',
    name: 'Tarot Merchant',
    icon: '🃏',
    description: 'Tarot cards appear 2x more frequently in the shop.',
    cost: VOUCHER_COST,
  },
  {
    id: 'tarot_tycoon',
    name: 'Tarot Tycoon',
    icon: '🎴',
    description:
      "Tarot cards appear 4x more frequently as a single card in the shop (replaces Tarot Merchant's rate). Unlocks after buying 50 Tarot cards from the shop, not packs (lifetime).",
    cost: VOUCHER_COST,
    upgradeOf: 'tarot_merchant',
  },
  {
    id: 'planet_merchant',
    name: 'Planet Merchant',
    icon: '🪐',
    description: 'Planet cards appear 2x more frequently in the shop.',
    cost: VOUCHER_COST,
  },
  {
    id: 'planet_tycoon',
    name: 'Planet Tycoon',
    icon: '🌌',
    description:
      "Planet cards appear 4x more frequently in the shop (replaces Planet Merchant's rate). Unlocks after buying 50 Planet cards from the shop, not packs (lifetime).",
    cost: VOUCHER_COST,
    upgradeOf: 'planet_merchant',
  },
  {
    id: 'seed_money',
    name: 'Seed Money',
    icon: '🌱',
    description: 'Raises the cap on interest earned each round to $10.',
    cost: VOUCHER_COST,
  },
  {
    id: 'money_tree',
    name: 'Money Tree',
    icon: '🌳',
    description:
      "Raises the cap on interest earned each round to $20 (replaces Seed Money's cap). Unlocks by maxing out interest for 10 consecutive rounds (lifetime streak).",
    cost: VOUCHER_COST,
    upgradeOf: 'seed_money',
  },
  {
    id: 'blenk',
    name: 'Blenk',
    icon: '⬜',
    description: 'Does nothing, but will be needed to unlock a reward.',
    cost: VOUCHER_COST,
  },
  {
    id: 'antimatter',
    name: 'Antimatter',
    icon: '🕳️',
    description: '+1 Cat slot. Unlocks after redeeming Blank 10 times (lifetime, across runs).',
    cost: VOUCHER_COST,
    upgradeOf: 'blenk',
  },
  {
    id: 'magic_trick',
    name: 'Magic Trick',
    icon: '🎩',
    description: 'Playing cards can be purchased from the shop as a single card (12.5% chance to appear).',
    cost: VOUCHER_COST,
  },
  {
    id: 'illusion',
    name: 'Illusion',
    icon: '🎭',
    description:
      "Magic Trick's single Playing Cards may have an Enhancement (40% chance) or an Edition (20% chance). Unlocks after buying 20 Playing Cards from the shop, not packs (lifetime).",
    cost: VOUCHER_COST,
    upgradeOf: 'magic_trick',
  },
  {
    id: 'hieroglyph',
    name: 'Hieroglyph',
    icon: '🗿',
    description: "-1 Ante's worth of Blind difficulty, -1 hand each round, for the rest of the run.",
    cost: VOUCHER_COST,
  },
  {
    id: 'petroglyph',
    name: 'Petroglyph',
    icon: '🪨',
    description:
      "Another -1 Ante's worth of Blind difficulty, and -1 discard each round, stacking with Hieroglyph. Unlocks by reaching Ante 12 (currently unreachable — this game caps at Ante 8).",
    cost: VOUCHER_COST,
    upgradeOf: 'hieroglyph',
  },
  {
    id: 'directors_cut',
    name: "Director's Cut",
    icon: '🎬',
    description: 'Reroll the Boss Blind once per Ante, $10 per reroll.',
    cost: VOUCHER_COST,
  },
  {
    id: 'retcon',
    name: 'Retcon',
    icon: '🎞️',
    description:
      "Reroll the Boss Blind unlimited times, $10 per roll (removes Director's Cut's once-per-Ante limit). Unlocks by discovering 25 Blinds, lifetime (currently unreachable — at most ~10 exist to discover).",
    cost: VOUCHER_COST,
    upgradeOf: 'directors_cut',
  },
  {
    id: 'paint_brush',
    name: 'Paint Brush',
    icon: '🖌️',
    description: '+1 card in hand.',
    cost: VOUCHER_COST,
  },
  {
    id: 'palette',
    name: 'Palette',
    icon: '🎨',
    description: '+1 more card in hand, stacking with Paint Brush. Unlocks by ever reducing your hand size to 5 cards (lifetime).',
    cost: VOUCHER_COST,
    upgradeOf: 'paint_brush',
  },
]

const VOUCHER_MAP = new Map(VOUCHERS.map((v) => [v.id, v]))

export function voucherDef(id: VoucherId): VoucherDef {
  const def = VOUCHER_MAP.get(id)
  if (!def) throw new Error(`Unknown voucher: ${id}`)
  return def
}

/** Base voucher id -> the upgrade it unlocks the possibility of. */
export const UPGRADE_OF: Partial<Record<VoucherId, VoucherId>> = Object.fromEntries(
  VOUCHERS.filter((v) => v.upgradeOf).map((v) => [v.upgradeOf as VoucherId, v.id]),
) as Partial<Record<VoucherId, VoucherId>>

export function hasVoucher(ownedVouchers: VoucherId[], id: VoucherId): boolean {
  return ownedVouchers.includes(id)
}

/** Lifetime meta-progress toward voucher upgrades — persists across runs
 *  (see useGameStore.startNewRun), except where a requirement says "in one
 *  run" (Liquidation, Glow Up), which instead read live/per-run state. */
export interface LifetimeProgress {
  totalSpentAtShop: number
  rerolls: number
  tarotFromPacks: number
  planetFromPacks: number
  cardsPlayed: number
  cardsDiscarded: number
  tarotBoughtFromShop: number
  planetBoughtFromShop: number
  playingCardsBoughtFromShop: number
  currentInterestStreak: number
  maxInterestStreak: number
  blankRedeemed: number
  discoveredBlindIds: string[]
  maxAnteReached: number
  minHandSizeReached: number
  /** Every Cat/card edition ever obtained, in any run — Foil/Holographic/
   *  Polychrome/Negative Tag unlocks (Balatro's real "in any run" wording). */
  obtainedEditions: CatEdition[]
}

export function createInitialLifetimeProgress(): LifetimeProgress {
  return {
    totalSpentAtShop: 0,
    rerolls: 0,
    tarotFromPacks: 0,
    planetFromPacks: 0,
    cardsPlayed: 0,
    cardsDiscarded: 0,
    tarotBoughtFromShop: 0,
    planetBoughtFromShop: 0,
    playingCardsBoughtFromShop: 0,
    currentInterestStreak: 0,
    maxInterestStreak: 0,
    blankRedeemed: 0,
    discoveredBlindIds: [],
    maxAnteReached: 1,
    minHandSizeReached: 8, // starting HAND_SIZE, duplicated here to avoid a runState.ts import cycle
    obtainedEditions: [],
  }
}

export interface UnlockContext {
  lifetime: LifetimeProgress
  ownedCats: OwnedCat[]
  /** Vouchers redeemed so far in the CURRENT run only (Liquidation's "in one run" requirement). */
  vouchersRedeemedThisRun: number
}

function isVoucherUnlocked(id: VoucherId, ctx: UnlockContext): boolean {
  switch (id) {
    case 'overstock_plus':
      return ctx.lifetime.totalSpentAtShop >= 2500
    case 'liquidation':
      return ctx.vouchersRedeemedThisRun >= 10
    case 'glow_up':
      return ctx.ownedCats.filter((c) => !!c.edition).length >= 5
    case 'reroll_glut':
      return ctx.lifetime.rerolls >= 100
    case 'omen_globe':
      return ctx.lifetime.tarotFromPacks >= 25
    case 'observatory':
      return ctx.lifetime.planetFromPacks >= 25
    case 'nacho_tong':
      return ctx.lifetime.cardsPlayed >= 2500
    case 'recyclomancy':
      return ctx.lifetime.cardsDiscarded >= 2500
    case 'tarot_tycoon':
      return ctx.lifetime.tarotBoughtFromShop >= 50
    case 'planet_tycoon':
      return ctx.lifetime.planetBoughtFromShop >= 50
    case 'money_tree':
      return ctx.lifetime.maxInterestStreak >= 10
    case 'antimatter':
      return ctx.lifetime.blankRedeemed >= 10
    case 'illusion':
      return ctx.lifetime.playingCardsBoughtFromShop >= 20
    case 'petroglyph':
      return ctx.lifetime.maxAnteReached >= 12
    case 'retcon':
      return ctx.lifetime.discoveredBlindIds.length >= 25
    case 'palette':
      return ctx.lifetime.minHandSizeReached <= 5
    default:
      return true // base vouchers have no unlock requirement
  }
}

/** A voucher can show up in the shop if it isn't already owned, and — for an
 *  upgrade tier — its base voucher is owned and its unlock requirement is met. */
export function isVoucherEligible(id: VoucherId, ownedVouchers: VoucherId[], ctx: UnlockContext): boolean {
  if (ownedVouchers.includes(id)) return false
  const def = voucherDef(id)
  if (def.upgradeOf && !ownedVouchers.includes(def.upgradeOf)) return false
  return isVoucherUnlocked(id, ctx)
}

export function shopCardSlotCount(ownedVouchers: VoucherId[]): number {
  return 2 + (hasVoucher(ownedVouchers, 'overstock') ? 1 : 0) + (hasVoucher(ownedVouchers, 'overstock_plus') ? 1 : 0)
}

/** Liquidation's 50% replaces Clearance Sale's 25%, rather than stacking. */
export function shopDiscountRate(ownedVouchers: VoucherId[]): number {
  if (hasVoucher(ownedVouchers, 'liquidation')) return 0.5
  if (hasVoucher(ownedVouchers, 'clearance_sale')) return 0.25
  return 0
}

export function applyClearanceSale(cost: number, ownedVouchers: VoucherId[]): number {
  const rate = shopDiscountRate(ownedVouchers)
  return rate > 0 ? Math.floor(cost * (1 - rate)) : cost
}

/** Money Tree's $20 replaces Seed Money's $10, rather than stacking. */
export function interestCap(ownedVouchers: VoucherId[]): number {
  if (hasVoucher(ownedVouchers, 'money_tree')) return 20
  if (hasVoucher(ownedVouchers, 'seed_money')) return 10
  return 5
}

/** Reroll Glut's discount stacks additively with Reroll Surplus's. */
export function rerollDiscount(ownedVouchers: VoucherId[]): number {
  return (hasVoucher(ownedVouchers, 'reroll_surplus') ? 2 : 0) + (hasVoucher(ownedVouchers, 'reroll_glut') ? 2 : 0)
}

/** Hieroglyph and Petroglyph's Ante offsets stack (both are independent -1s). */
export function effectiveAnte(ante: number, ownedVouchers: VoucherId[]): number {
  const offset = (hasVoucher(ownedVouchers, 'hieroglyph') ? 1 : 0) + (hasVoucher(ownedVouchers, 'petroglyph') ? 1 : 0)
  return Math.max(1, ante - offset)
}

/** 0 = no boost, 1 = Hone, 2 = Glow Up. Glow Up's rate replaces Hone's, rather than stacking. */
export function editionTier(ownedVouchers: VoucherId[]): 0 | 1 | 2 {
  if (hasVoucher(ownedVouchers, 'glow_up')) return 2
  if (hasVoucher(ownedVouchers, 'hone')) return 1
  return 0
}

/** 1 = no boost, 2 = Merchant, 4 = Tycoon. Tycoon's rate replaces Merchant's, rather than stacking. */
export function merchantMultiplier(ownedVouchers: VoucherId[], kind: 'tarot' | 'planet'): 1 | 2 | 4 {
  const tycoon: VoucherId = kind === 'tarot' ? 'tarot_tycoon' : 'planet_tycoon'
  const merchant: VoucherId = kind === 'tarot' ? 'tarot_merchant' : 'planet_merchant'
  if (hasVoucher(ownedVouchers, tycoon)) return 4
  if (hasVoucher(ownedVouchers, merchant)) return 2
  return 1
}

export function hasUnlimitedBossReroll(ownedVouchers: VoucherId[]): boolean {
  return hasVoucher(ownedVouchers, 'retcon')
}
