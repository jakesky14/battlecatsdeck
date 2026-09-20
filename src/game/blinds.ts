import type { Suit } from './cards'
import type { BlindKind } from './cats/types'

export type BossEffectId =
  | 'disable_cats'
  | 'reduced_hands'
  | 'reduced_discards'
  | 'extra_target'
  | 'reduced_hand_size'
  | 'ban_suit'
  | 'money_drain'
  | 'gauntlet'

export interface BossBlindDef {
  id: string
  name: string
  description: string
  effect: BossEffectId
  bannedSuit?: Suit
}

/** One boss per ante (1-8), in order. */
export const BOSS_BLINDS: BossBlindDef[] = [
  {
    id: 'doge',
    name: 'Doge',
    description: "Doge's stare disables all Cat abilities this round.",
    effect: 'disable_cats',
  },
  {
    id: 'snache',
    name: 'Snache',
    description: 'Snache jams your discards — one fewer discard this round.',
    effect: 'reduced_discards',
  },
  {
    id: 'those_guys',
    name: 'Those Guys',
    description: 'Those Guys swarm the field — target score up 25%.',
    effect: 'extra_target',
  },
  {
    id: 'teacher_bear',
    name: 'Teacher Bear',
    description: 'Teacher Bear docks you one hand to play this round.',
    effect: 'reduced_hands',
  },
  {
    id: 'one_horn',
    name: 'One Horn',
    description: 'One Horn charges through your hand — 2 fewer cards dealt this round.',
    effect: 'reduced_hand_size',
  },
  {
    id: 'the_face',
    name: 'The Face',
    description: "The Face's stare blanks every ♠ Spade — they score 0 Chips this round.",
    effect: 'ban_suit',
    bannedSuit: 'spades',
  },
  {
    id: 'dark_emperor_nyandam',
    name: 'Dark Emperor Nyandam',
    description: 'Dark Emperor Nyandam drains $1 from you every hand you play this round.',
    effect: 'money_drain',
  },
  {
    id: 'teacher_bun_bun',
    name: 'Teacher Bun Bun',
    description: 'Teacher Bun Bun brings the full gauntlet — target up 25% and one fewer hand.',
    effect: 'gauntlet',
  },
]

export function bossBlindForAnte(ante: number): BossBlindDef {
  return BOSS_BLINDS[(ante - 1) % BOSS_BLINDS.length]
}

export function anteBaseScore(ante: number): number {
  return Math.round(100 * Math.pow(1.6, ante - 1))
}

export function targetScore(ante: number, blind: BlindKind): number {
  const base = anteBaseScore(ante)
  if (blind === 'small') return base
  if (blind === 'big') return Math.round(base * 1.5)

  let target = base * 2
  const effect = bossBlindForAnte(ante).effect
  if (effect === 'extra_target' || effect === 'gauntlet') target = Math.round(target * 1.25)
  return Math.round(target)
}

export function blindLabel(blind: BlindKind, ante: number): string {
  if (blind === 'small') return 'Small Blind'
  if (blind === 'big') return 'Big Blind'
  return `Boss Blind — ${bossBlindForAnte(ante).name}`
}

export const BLIND_REWARD: Record<BlindKind, number> = {
  small: 3,
  big: 4,
  boss: 5,
}

export const SKIP_BONUS = 1

export function interestEarned(money: number): number {
  return Math.min(5, Math.floor(money / 5))
}

export const MAX_ANTE = 8
