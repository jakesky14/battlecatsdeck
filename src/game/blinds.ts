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
  icon: string
  description: string
  effect: BossEffectId
  bannedSuit?: Suit
}

/** One boss per ante (1-8), in order. */
export const BOSS_BLINDS: BossBlindDef[] = [
  {
    id: 'doge',
    name: 'Doge',
    icon: '🐕',
    description: "Doge's stare disables all Cat abilities this round.",
    effect: 'disable_cats',
  },
  {
    id: 'snache',
    name: 'Snache',
    icon: '🦎',
    description: 'Snache jams your discards — one fewer discard this round.',
    effect: 'reduced_discards',
  },
  {
    id: 'those_guys',
    name: 'Those Guys',
    icon: '👥',
    description: 'Those Guys swarm the field — max HP up 25%.',
    effect: 'extra_target',
  },
  {
    id: 'teacher_bear',
    name: 'Teacher Bear',
    icon: '🐻',
    description: 'Teacher Bear docks you one hand to play this round.',
    effect: 'reduced_hands',
  },
  {
    id: 'one_horn',
    name: 'One Horn',
    icon: '🦏',
    description: 'One Horn charges through your hand — 2 fewer cards dealt this round.',
    effect: 'reduced_hand_size',
  },
  {
    id: 'the_face',
    name: 'The Face',
    icon: '👁️',
    description: "The Face's stare blanks every ♠ Spade — they deal 0 Chips of damage this round.",
    effect: 'ban_suit',
    bannedSuit: 'spades',
  },
  {
    id: 'dark_emperor_nyandam',
    name: 'Dark Emperor Nyandam',
    icon: '😈',
    description: 'Dark Emperor Nyandam drains $1 from you every hand you play this round.',
    effect: 'money_drain',
  },
  {
    id: 'teacher_bun_bun',
    name: 'Teacher Bun Bun',
    icon: '🐰',
    description: 'Teacher Bun Bun brings the full gauntlet — max HP up 25% and one fewer hand.',
    effect: 'gauntlet',
  },
]

/** Basic enemies fought at Small/Big Blinds — flavor only, no mechanical debuff. */
export interface RegularEnemyDef {
  id: string
  name: string
  icon: string
}

export const REGULAR_ENEMIES: RegularEnemyDef[] = [
  { id: 'hippoe', name: 'Hippoe', icon: '🦛' },
  { id: 'croco', name: 'Croco', icon: '🐊' },
  { id: 'pigeon_de_sable', name: 'Pigeon de Sable', icon: '🐦' },
  { id: 'sir_seal', name: 'Sir Seal', icon: '🦭' },
  { id: 'shibalien', name: 'Shibalien', icon: '👽' },
  { id: 'squire_rel', name: 'Squire Rel', icon: '🗡️' },
]

export interface EnemyIdentity {
  id: string
  name: string
  icon: string
  description?: string
}

/** Which enemy is fought for a given ante/blind. Deterministic — no RNG/state needed.
 *  Pass `boss` to override the ante's usual boss (Director's Cut reroll). */
export function getEnemyForBlind(ante: number, blind: BlindKind, boss?: BossBlindDef): EnemyIdentity {
  if (blind === 'boss') {
    const b = boss ?? bossBlindForAnte(ante)
    return { id: b.id, name: b.name, icon: b.icon, description: b.description }
  }
  const index = (ante - 1) * 2 + (blind === 'big' ? 1 : 0)
  const enemy = REGULAR_ENEMIES[index % REGULAR_ENEMIES.length]
  return { id: enemy.id, name: enemy.name, icon: enemy.icon }
}

export function bossBlindForAnte(ante: number): BossBlindDef {
  return BOSS_BLINDS[(ante - 1) % BOSS_BLINDS.length]
}

export function bossBlindById(id: string): BossBlindDef | undefined {
  return BOSS_BLINDS.find((b) => b.id === id)
}

export function anteBaseScore(ante: number): number {
  return Math.round(100 * Math.pow(1.6, ante - 1))
}

/** Max HP of the enemy fought at this ante/blind. Pass `boss` to override the
 *  ante's usual boss (Director's Cut reroll) — affects its difficulty effect. */
export function targetScore(ante: number, blind: BlindKind, boss?: BossBlindDef): number {
  const base = anteBaseScore(ante)
  if (blind === 'small') return base
  if (blind === 'big') return Math.round(base * 1.5)

  let target = base * 2
  const effect = (boss ?? bossBlindForAnte(ante)).effect
  if (effect === 'extra_target' || effect === 'gauntlet') target = Math.round(target * 1.25)
  return Math.round(target)
}

export function blindLabel(blind: BlindKind, ante: number, boss?: BossBlindDef): string {
  if (blind === 'small') return 'Small Blind'
  if (blind === 'big') return 'Big Blind'
  return `Boss Blind — ${(boss ?? bossBlindForAnte(ante)).name}`
}

export const BLIND_REWARD: Record<BlindKind, number> = {
  small: 3,
  big: 4,
  boss: 5,
}

export const SKIP_BONUS = 1

export function interestEarned(money: number, cap = 5): number {
  return Math.min(cap, Math.floor(money / 5))
}

export const MAX_ANTE = 8
