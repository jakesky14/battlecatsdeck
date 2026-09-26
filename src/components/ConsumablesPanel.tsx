import { tarotCard } from '../data/tarots'
import { planetCard } from '../data/planets'
import { spectralCard } from '../data/spectrals'
import { handTypeDef } from '../data/handTypes'
import type { ConsumableItem } from '../game/consumables'
import { effectiveMaxConsumableSlots } from '../game/consumables'
import { PLANET_SELL_VALUE, SPECTRAL_SELL_VALUE, TAROT_SELL_VALUE } from '../game/cardMods'
import type { Phase } from '../game/runState'

interface ConsumablesPanelProps {
  consumables: ConsumableItem[]
  phase: Phase
  bonusConsumableSlots?: number
  onUse: (instanceId: string) => void
  onSell?: (instanceId: string) => void
  /** true while a targeting card is mid-selection (disables other Use buttons) */
  busy?: boolean
}

function displayFor(item: ConsumableItem) {
  if (item.kind === 'planet') {
    const planet = planetCard(item.cardId)
    return {
      icon: planet.icon,
      name: planet.name,
      description: `Levels up ${handTypeDef(planet.handType).label} instantly.`,
      needsTargets: false,
      restrictedToHand: false,
      sellValue: PLANET_SELL_VALUE,
    }
  }
  if (item.kind === 'spectral') {
    const def = spectralCard(item.cardId)
    return {
      icon: def.icon,
      name: def.name,
      description: def.description,
      needsTargets: def.minTargets > 0,
      restrictedToHand: def.minTargets > 0 || def.requiresHand,
      sellValue: SPECTRAL_SELL_VALUE,
    }
  }
  const def = tarotCard(item.cardId)
  return {
    icon: def.icon,
    name: def.name,
    description: def.description,
    needsTargets: def.minTargets > 0,
    restrictedToHand: def.minTargets > 0,
    sellValue: TAROT_SELL_VALUE,
  }
}

export function ConsumablesPanel({ consumables, phase, bonusConsumableSlots = 0, onUse, onSell, busy }: ConsumablesPanelProps) {
  const slotCount = effectiveMaxConsumableSlots(bonusConsumableSlots)
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: slotCount }).map((_, i) => {
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

        const { icon, name, description, needsTargets, restrictedToHand, sellValue } = displayFor(item)
        const usable = !busy && (restrictedToHand ? phase === 'playing' || phase === 'shop' : true)

        return (
          <div
            key={item.instanceId}
            title={description}
            className="flex w-32 flex-col items-center gap-1 rounded-lg border-2 border-indigo-400 bg-zinc-900 p-2 text-center"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-semibold">{name}</span>
            <span className="text-[11px] leading-tight text-zinc-400">{description}</span>
            <button
              type="button"
              onClick={() => onUse(item.instanceId)}
              disabled={!usable}
              title={restrictedToHand && !usable ? 'Only usable while playing a hand or in the shop' : undefined}
              className="mt-1 w-full rounded bg-indigo-500 px-2 py-0.5 text-[11px] font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-indigo-400"
            >
              {needsTargets ? 'Select cards' : 'Use'}
            </button>
            {onSell && (
              <button
                type="button"
                onClick={() => onSell(item.instanceId)}
                disabled={busy}
                className="w-full rounded bg-zinc-700 px-2 py-0.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-red-700"
              >
                Sell ${sellValue}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
