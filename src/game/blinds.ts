import type { BlindKind } from './cats/types'

export type BossEffectId = 'disable_cats' | 'reduced_hands' | 'reduced_discards' | 'extra_target'

export interface BossBlindDef {
  id: string
  name: string
  description: string
  effect: BossEffectId
}

export const BOSS_BLINDS: BossBlindDef[] = [
  {
    id: 'doge',
    name: 'Doge',
    description: "Doge's stare disables all Cat abilities this round.",
    effect: 'disable_cats',
  },
  {
    id: 'teacher_bear',
    name: 'Teacher Bear',
    description: 'Teacher Bear docks you one hand to play this round.',
    effect: 'reduced_hands',
  },
  {
    id: 'those_guys',
    name: 'Those Guys',
    description: 'Those Guys jam your discards — one fewer discard this round.',
    effect: 'reduced_discards',
  },
  {
    id: 'camelle',
    name: 'Camelle',
    description: "Camelle's rally raises the target score by 25%.",
    effect: 'extra_target',
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
  if (bossBlindForAnte(ante).effect === 'extra_target') target = Math.round(target * 1.25)
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
