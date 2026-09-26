export type VoucherId =
  | 'overstock'
  | 'clearance_sale'
  | 'hone'
  | 'reroll_surplus'
  | 'crystal_ball'
  | 'telescope'
  | 'grabber'
  | 'wasteful'
  | 'tarot_merchant'
  | 'planet_merchant'
  | 'seed_money'
  | 'blenk'
  | 'magic_trick'
  | 'hieroglyph'
  | 'directors_cut'
  | 'paint_brush'

export interface VoucherDef {
  id: VoucherId
  name: string
  icon: string
  description: string
  cost: number
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
    id: 'clearance_sale',
    name: 'Clearance Sale',
    icon: '🏷️',
    description: 'All cards and packs in the shop are 25% off, rounded down.',
    cost: VOUCHER_COST,
  },
  {
    id: 'hone',
    name: 'Hone',
    icon: '🔧',
    description: 'Foil, Holographic, and Polychrome cards appear 2x more often.',
    cost: VOUCHER_COST,
  },
  {
    id: 'reroll_surplus',
    name: 'Reroll Surplus',
    icon: '🔄',
    description: 'Rerolls cost $2 less.',
    cost: VOUCHER_COST,
  },
  {
    id: 'crystal_ball',
    name: 'Crystal Ball',
    icon: '🔮',
    description: '+1 consumable slot.',
    cost: VOUCHER_COST,
  },
  {
    id: 'telescope',
    name: 'Telescope',
    icon: '🔭',
    description: 'Celestial Packs always contain the Planet card for your most-played poker hand.',
    cost: VOUCHER_COST,
  },
  {
    id: 'grabber',
    name: 'Grabber',
    icon: '🤲',
    description: 'Permanently gain +1 hand per round.',
    cost: VOUCHER_COST,
  },
  {
    id: 'wasteful',
    name: 'Wasteful',
    icon: '🗑️',
    description: 'Permanently gain +1 discard per round.',
    cost: VOUCHER_COST,
  },
  {
    id: 'tarot_merchant',
    name: 'Tarot Merchant',
    icon: '🃏',
    description: 'Tarot cards appear 2x more frequently in the shop.',
    cost: VOUCHER_COST,
  },
  {
    id: 'planet_merchant',
    name: 'Planet Merchant',
    icon: '🪐',
    description: 'Planet cards appear 2x more frequently in the shop.',
    cost: VOUCHER_COST,
  },
  {
    id: 'seed_money',
    name: 'Seed Money',
    icon: '🌱',
    description: 'Raises the cap on interest earned each round to $10.',
    cost: VOUCHER_COST,
  },
  {
    id: 'blenk',
    name: 'Blenk',
    icon: '⬜',
    description: 'Does nothing, but will be needed to unlock a reward.',
    cost: VOUCHER_COST,
  },
  {
    id: 'magic_trick',
    name: 'Magic Trick',
    icon: '🎩',
    description: 'Playing cards can be purchased from the shop as a single card (12.5% chance to appear).',
    cost: VOUCHER_COST,
  },
  {
    id: 'hieroglyph',
    name: 'Hieroglyph',
    icon: '🗿',
    description: "-1 Ante's worth of Blind difficulty, -1 hand each round.",
    cost: VOUCHER_COST,
  },
  {
    id: 'directors_cut',
    name: "Director's Cut",
    icon: '🎬',
    description: 'Reroll the Boss Blind once per Ante, $10 per reroll.',
    cost: VOUCHER_COST,
  },
  {
    id: 'paint_brush',
    name: 'Paint Brush',
    icon: '🖌️',
    description: '+1 card in hand.',
    cost: VOUCHER_COST,
  },
]

const VOUCHER_MAP = new Map(VOUCHERS.map((v) => [v.id, v]))

export function voucherDef(id: VoucherId): VoucherDef {
  const def = VOUCHER_MAP.get(id)
  if (!def) throw new Error(`Unknown voucher: ${id}`)
  return def
}

export function hasVoucher(ownedVouchers: VoucherId[], id: VoucherId): boolean {
  return ownedVouchers.includes(id)
}

export function shopCardSlotCount(ownedVouchers: VoucherId[]): number {
  return 2 + (hasVoucher(ownedVouchers, 'overstock') ? 1 : 0)
}

export function applyClearanceSale(cost: number, ownedVouchers: VoucherId[]): number {
  return hasVoucher(ownedVouchers, 'clearance_sale') ? Math.floor(cost * 0.75) : cost
}

export function interestCap(ownedVouchers: VoucherId[]): number {
  return hasVoucher(ownedVouchers, 'seed_money') ? 10 : 5
}

export function rerollDiscount(ownedVouchers: VoucherId[]): number {
  return hasVoucher(ownedVouchers, 'reroll_surplus') ? 2 : 0
}

/** '-1 Ante' from Hieroglyph shifts Blind difficulty/boss identity back one Ante,
 *  without changing the real Ante counter (progression/victory still use the real one). */
export function effectiveAnte(ante: number, ownedVouchers: VoucherId[]): number {
  return Math.max(1, ante - (hasVoucher(ownedVouchers, 'hieroglyph') ? 1 : 0))
}
