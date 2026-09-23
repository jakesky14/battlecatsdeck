import { tarotCard } from '../data/tarots'
import type { ConsumableItem } from '../game/consumables'
import { MAX_CONSUMABLE_SLOTS } from '../game/consumables'
import type { Phase } from '../game/runState'

interface ConsumablesPanelProps {
  consumables: ConsumableItem[]
  phase: Phase
  onUse: (instanceId: string) => void
  /** true while a targeting card is mid-selection (disables other Use buttons) */
  busy?: boolean
}

export function ConsumablesPanel({ consumables, phase, onUse, busy }: ConsumablesPanelProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: MAX_CONSUMABLE_SLOTS }).map((_, i) => {
        const item = consumables[i]
        if (!item) {
          return (
            <div
              key={`empty-${i}`}
              className="flex w-32 items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 p-3 text-xs text-zinc-600"
            >
              Empty
            </div>
          )
        }

        const def = tarotCard(item.cardId)
        const needsTargets = def.minTargets > 0
        const usable = !busy && (needsTargets ? phase === 'playing' : true)

        return (
          <div
            key={item.instanceId}
            title={def.description}
            className="flex w-32 flex-col items-center gap-1 rounded-lg border-2 border-indigo-400 bg-zinc-900 p-2 text-center"
          >
            <span className="text-2xl">{def.icon}</span>
            <span className="text-xs font-semibold">{def.name}</span>
            <span className="text-[11px] leading-tight text-zinc-400">{def.description}</span>
            <button
              type="button"
              onClick={() => onUse(item.instanceId)}
              disabled={!usable}
              title={needsTargets && phase !== 'playing' ? 'Only usable while playing a hand' : undefined}
              className="mt-1 w-full rounded bg-indigo-500 px-2 py-0.5 text-[11px] font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-indigo-400"
            >
              {needsTargets ? 'Select cards' : 'Use'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
