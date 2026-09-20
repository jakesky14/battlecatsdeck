import type { Card } from '../cards'
import type { HandTypeId } from '../../data/handTypes'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'uber'

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
}

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'uber']

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  uber: '#c084fc',
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Normal',
  uncommon: 'Special',
  rare: 'Rare',
  uber: 'Uber Rare',
}
