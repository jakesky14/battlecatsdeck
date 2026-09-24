import { catDef } from '../game/cats/roster'
import { RARITY_COLORS } from '../game/cats/types'
import type { OwnedCat } from '../game/cats/types'
import { EDITION_LABELS, editionPriceDelta } from '../game/cardMods'

const EDITION_TEXT_COLOR: Record<string, string> = {
  foil: '#67e8f9',
  holographic: '#c084fc',
  polychrome: '#f472b6',
  negative: '#94a3b8',
}

interface CatRowProps {
  ownedCats: OwnedCat[]
  onSell?: (instanceId: string) => void
  onReorder?: (instanceId: string, direction: 'left' | 'right') => void
}

export function CatRow({ ownedCats, onSell, onReorder }: CatRowProps) {
  if (ownedCats.length === 0) {
    return <p className="text-sm text-zinc-500 italic">No cats yet — visit the shop to recruit some.</p>
  }

  return (
    <div className="flex flex-wrap gap-3">
      {ownedCats.map((owned, index) => {
        const def = catDef(owned.defId)
        const sellValue = def.sellValue + editionPriceDelta(owned.edition)
        return (
          <div
            key={owned.instanceId}
            title={def.description}
            className="flex w-32 flex-col items-center gap-1 rounded-lg border-2 bg-zinc-900 p-2 text-center"
            style={{ borderColor: RARITY_COLORS[def.rarity] }}
          >
            <span className="text-2xl">{def.icon}</span>
            <span className="text-xs font-semibold">{def.name}</span>
            {owned.edition && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide"
                style={{ color: EDITION_TEXT_COLOR[owned.edition] }}
              >
                {EDITION_LABELS[owned.edition]}
              </span>
            )}
            <span className="text-[11px] leading-tight text-zinc-400">{def.description}</span>
            {onReorder && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onReorder(owned.instanceId, 'left')}
                  disabled={index === 0}
                  aria-label="Move cat left"
                  className="rounded bg-zinc-800 px-1.5 text-xs text-zinc-400 disabled:opacity-30 hover:enabled:bg-zinc-700"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => onReorder(owned.instanceId, 'right')}
                  disabled={index === ownedCats.length - 1}
                  aria-label="Move cat right"
                  className="rounded bg-zinc-800 px-1.5 text-xs text-zinc-400 disabled:opacity-30 hover:enabled:bg-zinc-700"
                >
                  ▶
                </button>
              </div>
            )}
            {onSell && (
              <button
                type="button"
                onClick={() => onSell(owned.instanceId)}
                className="mt-1 rounded bg-zinc-700 px-2 py-0.5 text-[11px] hover:bg-red-700"
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
