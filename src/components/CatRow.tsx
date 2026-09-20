import { catDef } from '../game/cats/roster'
import { RARITY_COLORS } from '../game/cats/types'
import type { OwnedCat } from '../game/cats/types'

interface CatRowProps {
  ownedCats: OwnedCat[]
  onSell?: (instanceId: string) => void
}

export function CatRow({ ownedCats, onSell }: CatRowProps) {
  if (ownedCats.length === 0) {
    return <p className="text-sm text-zinc-500 italic">No cats yet — visit the shop to recruit some.</p>
  }

  return (
    <div className="flex flex-wrap gap-3">
      {ownedCats.map((owned) => {
        const def = catDef(owned.defId)
        return (
          <div
            key={owned.instanceId}
            title={def.description}
            className="flex w-32 flex-col items-center gap-1 rounded-lg border-2 bg-zinc-900 p-2 text-center"
            style={{ borderColor: RARITY_COLORS[def.rarity] }}
          >
            <span className="text-2xl">{def.icon}</span>
            <span className="text-xs font-semibold">{def.name}</span>
            <span className="text-[11px] leading-tight text-zinc-400">{def.description}</span>
            {onSell && (
              <button
                type="button"
                onClick={() => onSell(owned.instanceId)}
                className="mt-1 rounded bg-zinc-700 px-2 py-0.5 text-[11px] hover:bg-red-700"
              >
                Sell ${def.sellValue}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
