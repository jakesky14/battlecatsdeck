import { blindLabel } from '../game/blinds'
import type { RunState } from '../game/runState'

export function TopBar({ run }: { run: RunState }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-zinc-900 px-4 py-2">
      <div className="text-sm text-zinc-400">
        Ante {run.ante} · {blindLabel(run.blind, run.ante)}
      </div>
      <div className="text-lg font-bold text-yellow-400">${run.money}</div>
    </div>
  )
}
