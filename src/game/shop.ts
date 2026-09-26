import { CAT_ROSTER } from './cats/roster'
import { CAT_RARITY_WEIGHTS, type CatRarityKey } from './cats/types'
import type { Card } from './cards'
import { RANKS, SUITS, createExtraCard } from './cards'
import { PLANET_CARDS } from '../data/planets'
import { TAROT_CARDS, type TarotId } from '../data/tarots'
import { PACK_SIZE_COST, rollPackVariant, type PackCategory, type PackSize } from './packs'
import { pick, pickWeighted } from './rng'
import { editionPriceDelta, rollCardEdition, rollCatEdition, type CatEdition } from './cardMods'
import { applyClearanceSale, hasVoucher, rerollDiscount, shopCardSlotCount, type VoucherId } from './vouchers'

export const MAX_CAT_SLOTS = 5
export const BASE_REROLL_COST = 2
export const PACK_SLOT_COUNT = 2

/** Single-card shop slot prices — not specified by the design doc, set to
 *  match the genre's usual cheap consumable/playing-card pricing. */
export const TAROT_SHOP_COST = 3
export const PLANET_SHOP_COST = 3
export const PLAYING_CARD_SHOP_COST = 1
/** Not currently rollable as a single-card shop slot — no odds were given for
 *  it alongside Joker/Tarot/Planet/Magic Trick's Playing Card. Priced ahead of
 *  time for whenever that becomes possible (e.g. a future voucher). */
export const SPECTRAL_SHOP_COST = 4

export type ShopSlotKind = 'joker' | 'tarot' | 'planet' | 'playing_card' | 'pack'

export interface ShopSlot {
  id: string
  kind: ShopSlotKind
  /** set when kind === 'joker' */
  catId?: string
  catEdition?: CatEdition
  /** set when kind === 'tarot' */
  tarotId?: TarotId
  /** set when kind === 'planet' */
  planetId?: string
  /** set when kind === 'playing_card' */
  card?: Card
  /** set when kind === 'pack' */
  packCategory?: PackCategory
  packSize?: PackSize
  cost: number
}

export function rerollCost(rerollsUsedThisShop: number, ownedVouchers: VoucherId[]): number {
  return Math.max(0, BASE_REROLL_COST + rerollsUsedThisShop - rerollDiscount(ownedVouchers))
}

let slotCounter = 0
function nextSlotId(prefix: string, rng: () => number): string {
  slotCounter += 1
  return `${prefix}-${slotCounter}-${Math.floor(rng() * 1e6)}`
}

/** Base odds a single-card shop slot lands on each kind (sums to 100).
 *  Magic Trick carves its 12.5% straight out of Joker's share. */
const BASE_JOKER_WEIGHT = 71.4
const BASE_TAROT_WEIGHT = 14.3
const BASE_PLANET_WEIGHT = 14.3
const MAGIC_TRICK_WEIGHT = 12.5

export interface ShopGenContext {
  excludeCatIds: string[]
  ownedVouchers: VoucherId[]
  /** forces the first pack slot to be a Normal Buffoon Pack (first shop of the run) */
  forceBuffoonPack: boolean
}

function rollJokerSlot(used: Set<string>, honed: boolean, ownedVouchers: VoucherId[], rng: () => number): ShopSlot | null {
  const rarity = pickWeighted(CAT_RARITY_WEIGHTS, rng) as CatRarityKey
  let pool = CAT_ROSTER.filter((c) => c.rarity === rarity && !used.has(c.id))
  if (pool.length === 0) {
    pool = CAT_ROSTER.filter((c) => c.rarity in CAT_RARITY_WEIGHTS && !used.has(c.id))
  }
  if (pool.length === 0) return null

  const def = pool[Math.floor(rng() * pool.length)]
  const catEdition = rollCatEdition(rng, honed)
  const cost = applyClearanceSale(def.cost + editionPriceDelta(catEdition), ownedVouchers)
  used.add(def.id)
  return { id: nextSlotId('joker', rng), kind: 'joker', catId: def.id, catEdition, cost }
}

function rollCardSlot(ctx: ShopGenContext, used: Set<string>, honed: boolean, rng: () => number): ShopSlot | null {
  const hasMagicTrick = hasVoucher(ctx.ownedVouchers, 'magic_trick')
  const tarotBoost = hasVoucher(ctx.ownedVouchers, 'tarot_merchant') ? 2 : 1
  const planetBoost = hasVoucher(ctx.ownedVouchers, 'planet_merchant') ? 2 : 1

  const weights: Record<string, number> = {
    joker: hasMagicTrick ? BASE_JOKER_WEIGHT - MAGIC_TRICK_WEIGHT : BASE_JOKER_WEIGHT,
    tarot: BASE_TAROT_WEIGHT * tarotBoost,
    planet: BASE_PLANET_WEIGHT * planetBoost,
  }
  if (hasMagicTrick) weights.playing_card = MAGIC_TRICK_WEIGHT

  const kind = pickWeighted(weights, rng)

  if (kind === 'joker') return rollJokerSlot(used, honed, ctx.ownedVouchers, rng)

  if (kind === 'tarot') {
    const def = pick(TAROT_CARDS, rng)
    return {
      id: nextSlotId('tarot', rng),
      kind: 'tarot',
      tarotId: def.id,
      cost: applyClearanceSale(TAROT_SHOP_COST, ctx.ownedVouchers),
    }
  }

  if (kind === 'planet') {
    const def = pick(PLANET_CARDS, rng)
    return {
      id: nextSlotId('planet', rng),
      kind: 'planet',
      planetId: def.id,
      cost: applyClearanceSale(PLANET_SHOP_COST, ctx.ownedVouchers),
    }
  }

  const card = createExtraCard({ suit: pick(SUITS, rng), rank: pick(RANKS, rng), edition: rollCardEdition(rng, honed) }, rng)
  return {
    id: nextSlotId('card', rng),
    kind: 'playing_card',
    card,
    cost: applyClearanceSale(PLAYING_CARD_SHOP_COST, ctx.ownedVouchers),
  }
}

/** Builds the shop's single-card slots (2, or 3 with Overstock) and 2 pack
 *  slots. The 1 voucher slot is generated/persisted separately — see
 *  runState.ts, since it only restocks after a Boss Blind. */
export function generateShopSlots(ctx: ShopGenContext, rng: () => number = Math.random): ShopSlot[] {
  const used = new Set(ctx.excludeCatIds)
  const honed = hasVoucher(ctx.ownedVouchers, 'hone')
  const slots: ShopSlot[] = []

  const cardSlotCount = shopCardSlotCount(ctx.ownedVouchers)
  for (let i = 0; i < cardSlotCount; i++) {
    const slot = rollCardSlot(ctx, used, honed, rng)
    if (slot) slots.push(slot)
  }

  for (let i = 0; i < PACK_SLOT_COUNT; i++) {
    const forced = i === 0 && ctx.forceBuffoonPack
    const { category, size } = forced ? { category: 'buffoon' as PackCategory, size: 'normal' as PackSize } : rollPackVariant(rng)
    slots.push({
      id: nextSlotId('pack', rng),
      kind: 'pack',
      packCategory: category,
      packSize: size,
      cost: applyClearanceSale(PACK_SIZE_COST[size], ctx.ownedVouchers),
    })
  }

  return slots
}
