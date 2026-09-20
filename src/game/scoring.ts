import type { Card } from './cards'
import { cardChipValue } from './cards'
import { evaluateHand } from './handEvaluator'
import { handTypeDef } from '../data/handTypes'
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
}

export function computeScore(
  playedCards: Card[],
  ownedCats: OwnedCat[],
  options: ScoreOptions,
): ScoreResult {
  const { handType, scoringCards } = evaluateHand(playedCards)
  const base = handTypeDef(handType)

  const state: ScoringState = { chips: base.baseChips, mult: base.baseMult }
  for (const card of scoringCards) {
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
