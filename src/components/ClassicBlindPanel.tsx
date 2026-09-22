import { blindLabel } from '../game/blinds'
import type { BlindKind } from '../game/cats/types'

interface ClassicBlindPanelProps {
  blind: BlindKind
  ante: number
  target: number
  score: number
  description?: string
}

const PLAQUE_COLOR: Record<BlindKind, string> = {
  small: '#60a5fa',
  big: '#f97316',
  boss: '#c084fc',
}

export function ClassicBlindPanel({ blind, ante, target, score, description }: ClassicBlindPanelProps) {
  const pct = target > 0 ? Math.max(0, Math.min(100, (score / target) * 100)) : 0

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-full border-2 px-4 py-1 text-xs font-bold uppercase tracking-widest"
        style={{ borderColor: PLAQUE_COLOR[blind], color: PLAQUE_COLOR[blind] }}
      >
        {blindLabel(blind, ante)}
      </div>
      <div className="text-3xl font-bold text-yellow-400">
        {score} <span className="text-xl text-zinc-500">/ {target}</span>
      </div>
      <div className="w-full max-w-xs">
        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-yellow-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {description && <div className="max-w-sm text-center text-sm text-red-300">{description}</div>}
    </div>
  )
}
