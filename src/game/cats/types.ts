import type { Card } from '../cards'
import type { CatEdition } from '../cardMods'
import type { HandTypeId } from '../../data/handTypes'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'super_rare' | 'uber'

export type BlindKind = 'small' | 'big' | 'boss'

export interface ScoringState {
  chips: number
  mult: number
}

export interface HandPlayedContext {
  handType: HandTypeId
  playedCards: Card[]
  scoringCards: Card[]
  discardsUsedThisRound: number
  handsPlayedThisRound: number
  ante: number
  blind: BlindKind
  /** true while a boss blind's debuff is suppressing cat effects this round */
  catsDisabled: boolean
}

export interface CardScoredContext extends HandPlayedContext {
  card: Card
}

export interface RoundEndContext {
  won: boolean
  ante: number
  money: number
}

export interface CatEffects {
  /** Fires once per hand played, after base hand chips/mult are applied */
  onHandPlayed?: (state: ScoringState, ctx: HandPlayedContext) => void
  /** Fires once per card that scores within the played hand */
  onCardScored?: (state: ScoringState, ctx: CardScoredContext) => void
  /** Fires at the end of a round that was won; return extra money to award */
  onRoundEnd?: (ctx: RoundEndContext) => number
}

export interface CatDef {
  id: string
  name: string
  rarity: Rarity
  cost: number
  sellValue: number
  description: string
  icon: string
  effects: CatEffects
}

export interface OwnedCat {
  instanceId: string
  defId: string
  /** disabled for the current round by a boss blind debuff */
  disabledThisRound: boolean
  edition?: CatEdition
}

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'super_rare', 'uber']

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  super_rare: '#f97316',
  uber: '#c084fc',
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Normal',
  uncommon: 'Special',
  rare: 'Rare',
  super_rare: 'Super Rare',
  uber: 'Uber Rare',
}

export type CatRarityKey = 'common' | 'uncommon' | 'rare'

/** Odds a Cat shop/pack slot lands on each rarity (Balatro's real Joker odds).
 *  Super Rare and Uber ("Legendary") are never drawn through these normal odds —
 *  they're only obtainable via Wraith (Rare only) and The Soul (Legendary). */
export const CAT_RARITY_WEIGHTS: Record<CatRarityKey, number> = {
  common: 70,
  uncommon: 25,
  rare: 5,
}

/** The "Legendary" pool that only The Soul (Spectral card) can pull from. */
export const LEGENDARY_RARITIES: Rarity[] = ['super_rare', 'uber']

/** Negative-edition Cats don't take up a Cat slot. */
export function ownedCatSlotCount(cats: OwnedCat[]): number {
  return cats.filter((c) => c.edition !== 'negative').length
}
