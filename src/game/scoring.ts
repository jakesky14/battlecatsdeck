import type { Card, Suit } from './cards'
import { cardChipValue } from './cards'
import { evaluateHand } from './handEvaluator'
import { defaultHandLevels, handTypeAtLevel, type HandTypeId } from '../data/handTypes'
import { catDef } from './cats/roster'
import type { BlindKind, HandPlayedContext, OwnedCat, ScoringState } from './cats/types'
import { chance } from './rng'
import {
  BONUS_CARD_CHIPS,
  FOIL_CHIPS,
  GLASS_CARD_DESTROY_CHANCE,
  GLASS_CARD_MULT_X,
  GOLD_SEAL_MONEY,
  HOLOGRAPHIC_MULT,
  LUCKY_MONEY_BONUS,
  LUCKY_MONEY_CHANCE,
  LUCKY_MULT_BONUS,
  LUCKY_MULT_CHANCE,
  MULT_CARD_MULT,
  POLYCHROME_MULT_X,
  STEEL_CARD_MULT_X,
  STONE_CARD_CHIPS,
} from './cardMods'

export interface ScoreResult {
  handType: ReturnType<typeof evaluateHand>['handType']
  scoringCards: Card[]
  chips: number
  mult: number
  total: number
  moneyGained: number
  /** card ids destroyed by Glass enhancement this play, to be removed from hand + deck */
  destroyedCardIds: string[]
}

export interface ScoreOptions {
  discardsUsedThisRound: number
  handsPlayedThisRound: number
  ante: number
  blind: BlindKind
  catsDisabled: boolean
  handLevels?: Record<HandTypeId, number>
  bannedSuit?: Suit | null
  /** cards remaining in hand (not played) — Steel enhancement scores from these */
  heldCards?: Card[]
  rng?: () => number
}

interface MoneyRef {
  value: number
}

function scoreCardOnce(
  card: Card,
  state: ScoringState,
  moneyRef: MoneyRef,
  destroyedCardIds: string[],
  activeCats: OwnedCat[],
  ctx: HandPlayedContext,
  bannedSuit: Suit | null | undefined,
  rng: () => number,
): void {
  if (bannedSuit && card.suit === bannedSuit) return

  const trigger = () => {
    // Phase 1: chip/mult value, additive enhancements, cat per-card triggers, RNG money
    if (card.enhancement === 'stone') {
      state.chips += STONE_CARD_CHIPS
    } else {
      state.chips += cardChipValue(card.rank)
      if (card.enhancement === 'bonus') state.chips += BONUS_CARD_CHIPS
      if (card.enhancement === 'mult') state.mult += MULT_CARD_MULT
    }
    if (card.enhancement === 'lucky') {
      if (chance(LUCKY_MULT_CHANCE, rng)) state.mult += LUCKY_MULT_BONUS
      if (chance(LUCKY_MONEY_CHANCE, rng)) moneyRef.value += LUCKY_MONEY_BONUS
    }

    for (const owned of activeCats) {
      catDef(owned.defId).effects.onCardScored?.(state, { ...ctx, card })
    }

    if (card.seals?.includes('gold')) moneyRef.value += GOLD_SEAL_MONEY

    // Phase 2: edition bonuses
    if (card.edition === 'foil') state.chips += FOIL_CHIPS
    if (card.edition === 'holographic') state.mult += HOLOGRAPHIC_MULT
    if (card.edition === 'polychrome') state.mult *= POLYCHROME_MULT_X

    // Phase 3: multiplicative enhancements
    if (card.enhancement === 'glass') {
      state.mult *= GLASS_CARD_MULT_X
      if (chance(GLASS_CARD_DESTROY_CHANCE, rng)) destroyedCardIds.push(card.id)
    }
  }

  // Red Seal: the card's whole scoring contribution happens twice, not just once more per seal.
  trigger()
  if (card.seals?.includes('red')) trigger()
}

export function computeScore(
  playedCards: Card[],
  ownedCats: OwnedCat[],
  options: ScoreOptions,
): ScoreResult {
  // Stone cards have no rank/suit — excluded from hand-shape detection, always score their flat bonus.
  const nonStoneCards = playedCards.filter((c) => c.enhancement !== 'stone')
  const { handType, scoringCards: shapeScoringCards } = evaluateHand(nonStoneCards)
  const stoneCards = playedCards.filter((c) => c.enhancement === 'stone')
  const scoringCards = [...shapeScoringCards, ...stoneCards]

  const levels = options.handLevels ?? defaultHandLevels()
  const base = handTypeAtLevel(handType, levels[handType] ?? 1)
  const state: ScoringState = { chips: base.chips, mult: base.mult }

  const rng = options.rng ?? Math.random
  const moneyRef: MoneyRef = { value: 0 }
  const destroyedCardIds: string[] = []
  const activeCats = options.catsDisabled ? [] : ownedCats.filter((c) => !c.disabledThisRound)

  const ctx: HandPlayedContext = {
    handType,
    playedCards,
    scoringCards,
    discardsUsedThisRound: options.discardsUsedThisRound,
    handsPlayedThisRound: options.handsPlayedThisRound,
    ante: options.ante,
    blind: options.blind,
    catsDisabled: options.catsDisabled,
  }

  for (const card of scoringCards) {
    scoreCardOnce(card, state, moneyRef, destroyedCardIds, activeCats, ctx, options.bannedSuit, rng)
  }

  // Steel enhancement scores from cards still sitting in hand, not the ones played.
  for (const card of options.heldCards ?? []) {
    if (card.enhancement === 'steel') state.mult *= STEEL_CARD_MULT_X
  }

  for (const owned of activeCats) {
    catDef(owned.defId).effects.onHandPlayed?.(state, ctx)
  }

  for (const owned of activeCats) {
    if (owned.edition === 'foil') state.chips += FOIL_CHIPS
    if (owned.edition === 'holographic') state.mult += HOLOGRAPHIC_MULT
    if (owned.edition === 'polychrome') state.mult *= POLYCHROME_MULT_X
  }

  const chips = Math.max(0, state.chips)
  const mult = Math.max(0, state.mult)

  return {
    handType,
    scoringCards,
    chips,
    mult,
    total: Math.round(chips * mult),
    moneyGained: moneyRef.value,
    destroyedCardIds,
  }
}
