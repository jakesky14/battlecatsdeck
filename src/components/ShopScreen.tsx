import { CatRow } from './CatRow'
import { ConsumablesPanel } from './ConsumablesPanel'
import { catDef } from '../game/cats/roster'
import { RARITY_COLORS, RARITY_LABELS, ownedCatSlotCount } from '../game/cats/types'
import { EDITION_LABELS } from '../game/cardMods'
import { MAX_CONSUMABLE_SLOTS } from '../game/consumables'
import { PACK_INFO, effectiveMaxCatSlots } from '../game/packs'
import { rerollCost, type ShopSlot } from '../game/shop'
import { useGameStore } from '../state/useGameStore'

const EDITION_TEXT_COLOR: Record<string, string> = {
  foil: '#67e8f9',
  holographic: '#c084fc',
  polychrome: '#f472b6',
  negative: '#94a3b8',
}

function CatSlotCard({ slot, affordable, onBuy }: { slot: ShopSlot; affordable: boolean; onBuy: () => void }) {
  const def = catDef(slot.catId!)
  return (
    <div
      className="flex w-40 flex-col items-center gap-2 rounded-lg border-2 bg-zinc-800 p-3 text-center"
      style={{ borderColor: RARITY_COLORS[def.rarity] }}
    >
      <span className="text-3xl">{def.icon}</span>
      <span className="text-sm font-bold">{def.name}</span>
      <span className="text-[11px] uppercase tracking-wide" style={{ color: RARITY_COLORS[def.rarity] }}>
        {RARITY_LABELS[def.rarity]}
      </span>
      {slot.catEdition && (
        <span
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ color: EDITION_TEXT_COLOR[slot.catEdition] }}
        >
          {EDITION_LABELS[slot.catEdition]}
          {slot.catEdition === 'negative' ? ' (no slot cost!)' : ''}
        </span>
      )}
      <span className="text-xs leading-tight text-zinc-400">{def.description}</span>
      <button
        type="button"
        onClick={onBuy}
        disabled={!affordable}
        className="mt-1 w-full rounded bg-yellow-500 px-2 py-1 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-yellow-400"
      >
        Buy ${slot.cost}
      </button>
    </div>
  )
}

function PackSlotCard({ slot, affordable, onBuy }: { slot: ShopSlot; affordable: boolean; onBuy: () => void }) {
  const info = PACK_INFO[slot.packCategory!]
  return (
    <div className="flex w-40 flex-col items-center gap-2 rounded-lg border-2 border-indigo-400 bg-zinc-800 p-3 text-center">
      <span className="text-3xl">{info.icon}</span>
      <span className="text-sm font-bold">{info.label}</span>
      <span className="text-xs leading-tight text-zinc-400">{info.description}</span>
      <button
        type="button"
        onClick={onBuy}
        disabled={!affordable}
        className="mt-1 w-full rounded bg-indigo-400 px-2 py-1 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-indigo-300"
      >
        Open ${slot.cost}
      </button>
    </div>
  )
}

export function ShopScreen() {
  const run = useGameStore((s) => s.run)
  const buy = useGameStore((s) => s.buy)
  const sell = useGameStore((s) => s.sell)
  const reroll = useGameStore((s) => s.reroll)
  const leave = useGameStore((s) => s.leave)
  const useCard = useGameStore((s) => s.useCard)
  const sellCard = useGameStore((s) => s.sellCard)
  const moveCat = useGameStore((s) => s.moveCat)

  const cost = rerollCost(run.rerollsUsedThisShop)
  const maxSlots = effectiveMaxCatSlots(run.bonusCatSlots)
  const catSlotCount = ownedCatSlotCount(run.ownedCats)
  const slotsFull = catSlotCount >= maxSlots
  const consumablesFull = run.consumables.length >= MAX_CONSUMABLE_SLOTS

  const catSlots = run.shopOffers.filter((s) => s.kind === 'cat')
  const packSlots = run.shopOffers.filter((s) => s.kind === 'pack')

  function catAffordable(slot: ShopSlot): boolean {
    if (run.money < slot.cost) return false
    // Negative-edition cats never take a slot, so they're always purchasable if affordable.
    if (slot.catEdition === 'negative') return true
    return !slotsFull
  }

  function packAffordable(slot: ShopSlot): boolean {
    if (run.money < slot.cost) return false
    if (slot.packCategory === 'tarot' && consumablesFull) return false
    return true
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-zinc-900 p-6">
      {run.message && <div className="text-center text-lg font-semibold text-green-400">{run.message}</div>}
      <div className="text-center text-2xl font-bold">The Shop</div>
      <div className="text-center text-sm text-zinc-400">
        Cat slots: {catSlotCount} / {maxSlots}
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-zinc-300">Cat Capsule &amp; Rare Cat Banners</div>
        <div className="flex flex-wrap justify-center gap-4">
          {catSlots.length === 0 && (
            <div className="text-sm text-zinc-500 italic">Sold out — leave or reroll.</div>
          )}
          {catSlots.map((slot) => (
            <CatSlotCard key={slot.id} slot={slot} affordable={catAffordable(slot)} onBuy={() => buy(slot.id)} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-zinc-300">Packs</div>
        <div className="flex flex-wrap justify-center gap-4">
          {packSlots.map((slot) => (
            <PackSlotCard key={slot.id} slot={slot} affordable={packAffordable(slot)} onBuy={() => buy(slot.id)} />
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={reroll}
          disabled={run.money < cost}
          className="rounded-lg bg-zinc-700 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-zinc-600"
        >
          Reroll (${cost})
        </button>
        <button
          type="button"
          onClick={leave}
          className="rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-zinc-900 hover:bg-yellow-400"
        >
          Next Blind
        </button>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-zinc-300">Your Cats (click to sell)</div>
        <CatRow ownedCats={run.ownedCats} onSell={sell} onReorder={moveCat} />
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-zinc-300">Consumables</div>
        <ConsumablesPanel
          consumables={run.consumables}
          phase={run.phase}
          onUse={(instanceId) => useCard(instanceId, [])}
          onSell={sellCard}
        />
      </div>
    </div>
  )
}
