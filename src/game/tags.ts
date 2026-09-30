import { TAGS, tagDef, type TagId } from '../data/tags'
import { CAT_ROSTER } from './cats/roster'
import { ownedCatSlotCount, type CatRarityKey, type OwnedCat } from './cats/types'
import { HAND_TYPES, handTypeDef } from '../data/handTypes'
import { BOSS_BLINDS, bossBlindById, bossBlindForAnte } from './blinds'
import {
  VOUCHERS,
  effectiveAnte,
  editionTier,
  hasVoucher,
  isVoucherEligible,
  type LifetimeProgress,
  type VoucherId,
} from './vouchers'
import {
  PACK_CONTENTS,
  effectiveMaxCatSlots,
  generatePackOptions,
  type PackCategory,
  type PackGenContext,
  type PackSize,
} from './packs'
import { pick } from './rng'
import type { ShopSlot } from './shop'
import type { RunState } from './runState'

export type { TagId }

export interface TagUnlockContext {
  lifetime: LifetimeProgress
}

function isTagUnlocked(id: TagId, ctx: TagUnlockContext): boolean {
  switch (id) {
    case 'rare':
      // Unlocks by discovering the Blueprint Joker — intentionally left
      // unreachable until Blueprint is implemented, per the design doc.
      return false
    case 'foil':
      return ctx.lifetime.obtainedEditions.includes('foil')
    case 'holographic':
      return ctx.lifetime.obtainedEditions.includes('holographic')
    case 'polychrome':
      return ctx.lifetime.obtainedEditions.includes('polychrome')
    case 'negative':
      return ctx.lifetime.obtainedEditions.includes('negative')
    default:
      return true
  }
}

export function eligibleTags(ante: number, ctx: TagUnlockContext): TagId[] {
  return TAGS.filter((t) => ante >= t.minAnte && isTagUnlocked(t.id, ctx)).map((t) => t.id)
}

export function rollTag(ante: number, ctx: TagUnlockContext, rng: () => number = Math.random): TagId {
  return pick(eligibleTags(ante, ctx), rng)
}

export interface TagResult {
  state: RunState
  message: string
}

function grantInstantPack(state: RunState, category: PackCategory, size: PackSize, rng: () => number): RunState {
  const ctx: PackGenContext = {
    excludeCatIds: state.ownedCats.map((c) => c.defId),
    handTypePlayCounts: state.handTypePlayCounts,
    hasTelescope: hasVoucher(state.ownedVouchers, 'telescope'),
    editionTier: editionTier(state.ownedVouchers),
    hasOmenGlobe: hasVoucher(state.ownedVouchers, 'omen_globe'),
  }
  const options = generatePackOptions(category, size, ctx, rng)
  const { choose } = PACK_CONTENTS[category][size]
  return { ...state, packOpening: { slotId: 'tag-granted', category, size, chooseRemaining: choose, options } }
}

/** Applies a single Tag's effect by id — exported so callers/tests can
 *  target a specific Tag directly rather than only via the random roll in
 *  grantTag. */
export function applyTagEffect(state: RunState, id: TagId, rng: () => number = Math.random): TagResult {
  switch (id) {
    case 'uncommon':
      return { state: { ...state, pendingUncommonJoker: true }, message: 'Your next shop has a free Special Cat!' }
    case 'rare':
      return { state: { ...state, pendingRareJoker: true }, message: 'Your next shop has a free Rare Cat!' }
    case 'investment':
      return {
        state: { ...state, pendingInvestmentPayouts: state.pendingInvestmentPayouts + 1 },
        message: "+$25 after you defeat this Ante's Boss Blind!",
      }
    case 'voucher':
      return { state: { ...state, pendingVoucherTag: true }, message: 'Your next shop offers a Voucher!' }
    case 'boss': {
      const ante = effectiveAnte(state.ante, state.ownedVouchers)
      const current = state.bossOverrideId
        ? (bossBlindById(state.bossOverrideId) ?? bossBlindForAnte(ante))
        : bossBlindForAnte(ante)
      const candidates = BOSS_BLINDS.filter((b) => b.id !== current.id)
      const next = pick(candidates, rng)
      return { state: { ...state, bossOverrideId: next.id }, message: `This Ante's Boss is now ${next.icon} ${next.name}!` }
    }
    case 'charm':
      return { state: grantInstantPack(state, 'arcana', 'mega', rng), message: 'Opening a free Mega Arcana Pack!' }
    case 'standard':
      return { state: grantInstantPack(state, 'standard', 'mega', rng), message: 'Opening a free Mega Standard Pack!' }
    case 'meteor':
      return { state: grantInstantPack(state, 'celestial', 'mega', rng), message: 'Opening a free Mega Celestial Pack!' }
    case 'buffoon':
      return { state: grantInstantPack(state, 'buffoon', 'mega', rng), message: 'Opening a free Mega Buffoon Pack!' }
    case 'ethereal':
      return { state: grantInstantPack(state, 'spectral', 'normal', rng), message: 'Opening a free Spectral Pack!' }
    case 'coupon':
      return {
        state: { ...state, pendingFreeShop: true },
        message: 'The initial cards and packs in your next shop are free!',
      }
    case 'double':
      return { state: { ...state, pendingDoubleTag: true }, message: 'Your next Tag will be doubled!' }
    case 'juggle':
      return {
        state: { ...state, juggleBonusNextRound: state.juggleBonusNextRound + 3 },
        message: '+3 hand size next round!',
      }
    case 'd6':
      return { state: { ...state, pendingCheapReroll: true }, message: 'Rerolls in your next shop start at $0!' }
    case 'speed': {
      const gain = 5 + 5 * state.blindsSkippedThisRun
      return { state: { ...state, money: state.money + gain }, message: `+$${gain}!` }
    }
    case 'economy': {
      const gain = Math.min(state.money, 40)
      return { state: { ...state, money: state.money + gain }, message: `Doubled your money! (+$${gain})` }
    }
    case 'handy': {
      const gain = state.handsPlayedThisRun
      return { state: { ...state, money: state.money + gain }, message: `+$${gain} for hands played this run!` }
    }
    case 'garbage': {
      const gain = state.unusedDiscardsThisRun
      return { state: { ...state, money: state.money + gain }, message: `+$${gain} for unused discards this run!` }
    }
    case 'top_up': {
      const maxSlots = effectiveMaxCatSlots(state.bonusCatSlots)
      let ownedCats = state.ownedCats
      let created = 0
      for (let i = 0; i < 2; i++) {
        if (ownedCatSlotCount(ownedCats) >= maxSlots) break
        const pool = CAT_ROSTER.filter((c) => c.rarity === 'common' && !ownedCats.some((o) => o.defId === c.id))
        if (pool.length === 0) break
        const def = pick(pool, rng)
        const instance: OwnedCat = {
          instanceId: `${def.id}-${Date.now()}-${rng().toString(36).slice(2)}`,
          defId: def.id,
          disabledThisRound: false,
        }
        ownedCats = [...ownedCats, instance]
        created += 1
      }
      return {
        state: { ...state, ownedCats },
        message: created > 0 ? `Created ${created} Normal Cat(s)!` : 'No room for new Cats.',
      }
    }
    case 'orbital': {
      const handType = pick(HAND_TYPES, rng).id
      const newLevel = (state.handLevels[handType] ?? 1) + 3
      return {
        state: { ...state, handLevels: { ...state.handLevels, [handType]: newLevel } },
        message: `${handTypeDef(handType).label} leveled up to Lv.${newLevel}!`,
      }
    }
    case 'foil':
      return {
        state: { ...state, pendingFreeEdition: 'foil' },
        message: 'Your next base-edition shop Joker is free and becomes Foil!',
      }
    case 'holographic':
      return {
        state: { ...state, pendingFreeEdition: 'holographic' },
        message: 'Your next base-edition shop Joker is free and becomes Holographic!',
      }
    case 'polychrome':
      return {
        state: { ...state, pendingFreeEdition: 'polychrome' },
        message: 'Your next base-edition shop Joker is free and becomes Polychrome!',
      }
    case 'negative':
      return {
        state: { ...state, pendingFreeEdition: 'negative' },
        message: 'Your next base-edition shop Joker is free and becomes Negative!',
      }
  }
}

/** Rolls a random eligible Tag and applies it instantly. Handles Double Tag:
 *  if the PREVIOUS skip granted Double Tag, this tag's effect is applied
 *  twice (Double Tag itself is excluded from being doubled). */
export function grantTag(state: RunState, rng: () => number = Math.random): TagResult {
  const id = rollTag(state.ante, { lifetime: state.lifetime }, rng)

  const willDouble = state.pendingDoubleTag && id !== 'double'
  let working = willDouble ? { ...state, pendingDoubleTag: false } : state

  const first = applyTagEffect(working, id, rng)
  let finalState = first.state
  let message = `${tagDef(id).icon} ${tagDef(id).name}: ${first.message}`

  if (id === 'double') {
    finalState = { ...finalState, pendingDoubleTag: true }
  }

  if (willDouble) {
    const second = applyTagEffect(finalState, id, rng)
    finalState = second.state
    message += ` (Doubled: ${second.message})`
  }

  return { state: finalState, message }
}

function forceJokerSlot(offers: ShopSlot[], rarity: CatRarityKey, rng: () => number): ShopSlot[] | null {
  const candidateIndexes = offers.reduce<number[]>((acc, s, i) => {
    if (s.kind !== 'pack') acc.push(i)
    return acc
  }, [])
  if (candidateIndexes.length === 0) return null

  const pool = CAT_ROSTER.filter((c) => c.rarity === rarity)
  if (pool.length === 0) return null

  const index = candidateIndexes[Math.floor(rng() * candidateIndexes.length)]
  const def = pick(pool, rng)
  const forcedSlot: ShopSlot = { id: offers[index].id, kind: 'joker', catId: def.id, catEdition: undefined, cost: 0 }
  return offers.map((s, i) => (i === index ? forcedSlot : s))
}

export interface ShopTagResult {
  state: RunState
  shopOffers: ShopSlot[]
}

/** Applies pending shop-affecting Tags (Uncommon, Rare, Foil/Holographic/
 *  Polychrome/Negative, Coupon, D6) to a freshly-generated shop. Coupon,
 *  Uncommon and Rare consume their pending flag on this first generation
 *  regardless of outcome (they don't persist through a manual reroll —
 *  rerolling fully regenerates the shop, so a tag-granted freebie can be
 *  rerolled away). Foil/Holographic/Polychrome/Negative instead stay
 *  pending across shop visits until a base-edition Joker slot actually
 *  appears to convert, matching "next base edition shop Joker". */
export function applyPendingShopTags(
  state: RunState,
  shopOffers: ShopSlot[],
  rng: () => number = Math.random,
): ShopTagResult {
  let offers = shopOffers
  let next = state

  if (next.pendingFreeShop) {
    offers = offers.map((s) => ({ ...s, cost: 0 }))
    next = { ...next, pendingFreeShop: false }
  }

  if (next.pendingUncommonJoker) {
    const forced = forceJokerSlot(offers, 'uncommon', rng)
    if (forced) offers = forced
    next = { ...next, pendingUncommonJoker: false }
  }

  if (next.pendingRareJoker) {
    const forced = forceJokerSlot(offers, 'rare', rng)
    if (forced) offers = forced
    next = { ...next, pendingRareJoker: false }
  }

  if (next.pendingFreeEdition) {
    const index = offers.findIndex((s) => s.kind === 'joker' && !s.catEdition)
    if (index !== -1) {
      const edition = next.pendingFreeEdition
      offers = offers.map((s, i) => (i === index ? { ...s, catEdition: edition, cost: 0 } : s))
      next = { ...next, pendingFreeEdition: null }
    }
  }

  if (next.pendingCheapReroll) {
    next = { ...next, cheapRerollThisShop: true, pendingCheapReroll: false }
  }

  return { state: next, shopOffers: offers }
}

function pickVoucherOffer(state: RunState, rng: () => number): VoucherId | null {
  const pool = VOUCHERS.filter((v) =>
    isVoucherEligible(v.id, state.ownedVouchers, {
      lifetime: state.lifetime,
      ownedCats: state.ownedCats,
      vouchersRedeemedThisRun: state.vouchersRedeemedThisRun,
    }),
  )
  if (pool.length === 0) return null
  return pick(pool, rng).id
}

/** Voucher Tag: forces a Voucher to appear in the next shop if one wouldn't
 *  have restocked there normally. */
export function applyPendingVoucherTag(
  state: RunState,
  voucherOffer: VoucherId | null,
  rng: () => number = Math.random,
): { state: RunState; voucherOffer: VoucherId | null } {
  if (!state.pendingVoucherTag) return { state, voucherOffer }
  const next = { ...state, pendingVoucherTag: false }
  if (voucherOffer) return { state: next, voucherOffer }
  return { state: next, voucherOffer: pickVoucherOffer(state, rng) }
}

/** Investment Tag: pays out when THIS Ante's Boss Blind is defeated — call
 *  with the state from just before the win/ante transition, so `blind` is
 *  still 'boss'. */
export function applyInvestmentPayout(state: RunState): RunState {
  if (state.blind !== 'boss' || state.pendingInvestmentPayouts <= 0) return state
  const gain = state.pendingInvestmentPayouts * 25
  return { ...state, money: state.money + gain, pendingInvestmentPayouts: 0 }
}
