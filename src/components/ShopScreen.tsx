import { Card } from './Card'
import { CatRow } from './CatRow'
import { ConsumablesPanel } from './ConsumablesPanel'
import { PendingTagsPanel } from './PendingTagsPanel'
import { catDef } from '../game/cats/roster'
import { RARITY_COLORS, RARITY_LABELS, ownedCatSlotCount } from '../game/cats/types'
import { EDITION_LABELS } from '../game/cardMods'
import { effectiveMaxConsumableSlots } from '../game/consumables'
import { tarotCard } from '../data/tarots'
import { planetCard } from '../data/planets'
import { handTypeDef } from '../data/handTypes'
import { PACK_CONTENTS, effectiveMaxCatSlots, packLabel } from '../game/packs'
import { rerollCost, type ShopSlot } from '../game/shop'
import { applyClearanceSale, voucherDef } from '../game/vouchers'
import { useGameStore } from '../state/useGameStore'

function SlotShell({
  borderColor,
  icon,
  title,
  subtitle,
  description,
  actionLabel,
  affordable,
  onAction,
}: {
  borderColor: string
  icon: string
  title: string
  subtitle?: string
  description: string
  actionLabel: string
  affordable: boolean
  onAction: () => void
}) {
  return (
    <div
      className="flex w-40 flex-col items-center gap-2 rounded-lg border-2 bg-zinc-800 p-3 text-center"
      style={{ borderColor }}
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-sm font-bold">{title}</span>
      {subtitle && <span className="text-[11px] uppercase tracking-wide" style={{ color: borderColor }}>{subtitle}</span>}
      <span className="text-xs leading-tight text-zinc-400">{description}</span>
      <button
        type="button"
        onClick={onAction}
        disabled={!affordable}
        className="mt-1 w-full rounded bg-yellow-500 px-2 py-1 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-yellow-400"
      >
        {actionLabel}
      </button>
    </div>
  )
}

function CardSlotCard({ slot, affordable, onBuy }: { slot: ShopSlot; affordable: boolean; onBuy: () => void }) {
  if (slot.kind === 'joker') {
    const def = catDef(slot.catId!)
    return (
      <SlotShell
        borderColor={RARITY_COLORS[def.rarity]}
        icon={def.icon}
        title={def.name}
        subtitle={
          slot.catEdition ? `${EDITION_LABELS[slot.catEdition]} · ${RARITY_LABELS[def.rarity]}` : RARITY_LABELS[def.rarity]
        }
        description={def.description}
        actionLabel={`Buy $${slot.cost}`}
        affordable={affordable}
        onAction={onBuy}
      />
    )
  }
  if (slot.kind === 'tarot') {
    const def = tarotCard(slot.tarotId!)
    return (
      <SlotShell
        borderColor="#818cf8"
        icon={def.icon}
        title={def.name}
        subtitle="Tarot"
        description={def.description}
        actionLabel={`Buy $${slot.cost}`}
        affordable={affordable}
        onAction={onBuy}
      />
    )
  }
  if (slot.kind === 'planet') {
    const def = planetCard(slot.planetId!)
    return (
      <SlotShell
        borderColor="#38bdf8"
        icon={def.icon}
        title={def.name}
        subtitle="Planet"
        description={`Levels up ${handTypeDef(def.handType).label} instantly.`}
        actionLabel={`Buy $${slot.cost}`}
        affordable={affordable}
        onAction={onBuy}
      />
    )
  }
  // playing_card
  return (
    <div className="flex w-40 flex-col items-center gap-2 rounded-lg border-2 border-zinc-500 bg-zinc-800 p-3 text-center">
      <Card card={slot.card!} small />
      <span className="text-[11px] uppercase tracking-wide text-zinc-400">Playing Card</span>
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

function PackSlotCard({ slot, affordable, onOpen }: { slot: ShopSlot; affordable: boolean; onOpen: () => void }) {
  const category = slot.packCategory!
  const size = slot.packSize!
  const { count, choose } = PACK_CONTENTS[category][size]
  return (
    <SlotShell
      borderColor="#a78bfa"
      icon="📦"
      title={packLabel(category, size)}
      description={`Choose ${choose} of ${count}.`}
      actionLabel={`Open $${slot.cost}`}
      affordable={affordable}
      onAction={onOpen}
    />
  )
}

function VoucherSlotCard({
  id,
  cost,
  affordable,
  onBuy,
}: {
  id: string
  cost: number
  affordable: boolean
  onBuy: () => void
}) {
  const def = voucherDef(id as Parameters<typeof voucherDef>[0])
  return (
    <SlotShell
      borderColor="#facc15"
      icon={def.icon}
      title={def.name}
      subtitle="Voucher"
      description={def.description}
      actionLabel={`Buy $${cost}`}
      affordable={affordable}
      onAction={onBuy}
    />
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
  const openPack = useGameStore((s) => s.openPack)
  const buyVoucherOffer = useGameStore((s) => s.buyVoucherOffer)

  const cost = rerollCost(run.rerollsUsedThisShop, run.ownedVouchers, run.cheapRerollThisShop ? 0 : undefined)
  const maxSlots = effectiveMaxCatSlots(run.bonusCatSlots)
  const catSlotCount = ownedCatSlotCount(run.ownedCats)
  const slotsFull = catSlotCount >= maxSlots
  const consumablesFull = run.consumables.length >= effectiveMaxConsumableSlots(run.bonusConsumableSlots)

  const cardSlots = run.shopOffers.filter((s) => s.kind !== 'pack')
  const packSlots = run.shopOffers.filter((s) => s.kind === 'pack')

  function cardAffordable(slot: ShopSlot): boolean {
    if (run.money < slot.cost) return false
    if (slot.kind === 'joker') {
      if (slot.catEdition === 'negative') return true
      return !slotsFull
    }
    if (slot.kind === 'tarot') return !consumablesFull
    return true
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-zinc-900 p-6">
      {run.message && <div className="text-center text-lg font-semibold text-green-400">{run.message}</div>}
      <div className="text-center text-2xl font-bold">The Shop</div>
      <div className="text-center text-sm text-zinc-400">
        Cat slots: {catSlotCount} / {maxSlots}
      </div>
      <PendingTagsPanel run={run} />

      <div>
        <div className="mb-2 text-sm font-semibold text-zinc-300">Cards</div>
        <div className="flex flex-wrap justify-center gap-4">
          {cardSlots.length === 0 && <div className="text-sm text-zinc-500 italic">Sold out — leave or reroll.</div>}
          {cardSlots.map((slot) => (
            <CardSlotCard key={slot.id} slot={slot} affordable={cardAffordable(slot)} onBuy={() => buy(slot.id)} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-zinc-300">Packs</div>
        <div className="flex flex-wrap justify-center gap-4">
          {packSlots.map((slot) => (
            <PackSlotCard key={slot.id} slot={slot} affordable={run.money >= slot.cost} onOpen={() => openPack(slot.id)} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-zinc-300">Voucher</div>
        <div className="flex flex-wrap justify-center gap-4">
          {run.voucherOffer ? (
            <VoucherSlotCard
              id={run.voucherOffer}
              cost={applyClearanceSale(voucherDef(run.voucherOffer).cost, run.ownedVouchers)}
              affordable={run.money >= applyClearanceSale(voucherDef(run.voucherOffer).cost, run.ownedVouchers)}
              onBuy={buyVoucherOffer}
            />
          ) : (
            <div className="text-sm text-zinc-500 italic">No voucher offered right now.</div>
          )}
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
          bonusConsumableSlots={run.bonusConsumableSlots}
          onUse={(instanceId) => useCard(instanceId, [])}
          onSell={sellCard}
        />
      </div>
    </div>
  )
}
