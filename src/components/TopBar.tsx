import { blindLabel } from '../game/blinds'
import { currentBossBlind, type RunState } from '../game/runState'
import { voucherDef } from '../game/vouchers'

export function TopBar({ run }: { run: RunState }) {
  const boss = run.blind === 'boss' ? currentBossBlind(run) : undefined
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-zinc-900 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          Ante {run.ante} · {blindLabel(run.blind, run.ante, boss)}
        </div>
        <div className="text-lg font-bold text-yellow-400">${run.money}</div>
      </div>
      {run.ownedVouchers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {run.ownedVouchers.map((id) => {
            const def = voucherDef(id)
            return (
              <span
                key={id}
                title={def.description}
                className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-300"
              >
                {def.icon} {def.name}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
