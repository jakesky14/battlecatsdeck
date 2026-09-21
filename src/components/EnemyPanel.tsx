import type { EnemyIdentity } from '../game/blinds'

interface EnemyPanelProps {
  enemy: EnemyIdentity
  maxHp: number
  currentHp: number
}

export function EnemyPanel({ enemy, maxHp, currentHp }: EnemyPanelProps) {
  const clampedHp = Math.max(0, currentHp)
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (clampedHp / maxHp) * 100)) : 0

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-5xl">{enemy.icon}</div>
      <div className="text-xl font-bold">{enemy.name}</div>
      <div className="w-full max-w-xs">
        <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-red-600 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 text-center text-sm text-zinc-400">
          {clampedHp} / {maxHp} HP
        </div>
      </div>
      {enemy.description && <div className="max-w-sm text-center text-sm text-red-300">{enemy.description}</div>}
    </div>
  )
}
