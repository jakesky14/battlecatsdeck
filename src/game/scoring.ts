import type { Card, Suit } from './cards'
import { cardChipValue } from './cards'
import { evaluateHand } from './handEvaluator'
import { defaultHandLevels, handTypeAtLevel, type HandTypeId } from '../data/handTypes'
import { catDef } from './cats/roster'
import type { BlindKind, OwnedCat, ScoringState } from './cats/types'

export interface ScoreResult {
  handType: ReturnType<typeof evaluateHand>['handType']
  scoringCards: Card[]
  chips: number
  mult: number
  total: number
}

export interface ScoreOptions {
  discardsUsedThisRound: number
  handsPlayedThisRound: number
  ante: number
  blind: BlindKind
  catsDisabled: boolean
  handLevels?: Record<HandTypeId, number>
  bannedSuit?: Suit | null
}

export function computeScore(
  playedCards: Card[],
  ownedCats: OwnedCat[],
  options: ScoreOptions,
): ScoreResult {
  const { handType, scoringCards } = evaluateHand(playedCards)
  const levels = options.handLevels ?? defaultHandLevels()
  const base = handTypeAtLevel(handType, levels[handType] ?? 1)

  const state: ScoringState = { chips: base.chips, mult: base.mult }
  const bannedSuit = options.bannedSuit ?? null
  for (const card of scoringCards) {
    if (card.suit === bannedSuit) continue
    state.chips += cardChipValue(card.rank)
  }

  const activeCats = ownedCats.filter((c) => !c.disabledThisRound)

  if (!options.catsDisabled) {
    const handCtx = {
      handType,
      playedCards,
      scoringCards,
      discardsUsedThisRound: options.discardsUsedThisRound,
      handsPlayedThisRound: options.handsPlayedThisRound,
      ante: options.ante,
      blind: options.blind,
      catsDisabled: options.catsDisabled,
    }

    for (const owned of activeCats) {
      catDef(owned.defId).effects.onHandPlayed?.(state, handCtx)
    }

    for (const card of scoringCards) {
      if (card.suit === bannedSuit) continue
      for (const owned of activeCats) {
        catDef(owned.defId).effects.onCardScored?.(state, { ...handCtx, card })
      }
    }
  }

  const chips = Math.max(0, state.chips)
  const mult = Math.max(0, state.mult)

  return {
    handType,
    scoringCards,
    chips,
    mult,
    total: Math.round(chips * mult),
  }
}
