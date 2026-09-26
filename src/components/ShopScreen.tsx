import { useState } from 'react'
import { Card } from './Card'
import { CatRow } from './CatRow'
import { ConsumablesPanel } from './ConsumablesPanel'
import { catDef } from '../game/cats/roster'
import { RARITY_COLORS, RARITY_LABELS, ownedCatSlotCount } from '../game/cats/types'
import { EDITION_LABELS } from '../game/cardMods'
import { effectiveMaxConsumableSlots } from '../game/consumables'
import { rankLabel, suitSymbol } from '../game/cards'
import { tarotCard } from '../data/tarots'
import { planetCard } from '../data/planets'
import { spectralCard } from '../data/spectrals'
import { handTypeDef } from '../data/handTypes'
import { PACK_CONTENTS, effectiveMaxCatSlots, packLabel, type PackOption } from '../game/packs'
import { rerollCost, type ShopSlot } from '../game/shop'
import { voucherDef } from '../game/vouchers'
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

function VoucherSlotCard({ id, affordable, onBuy }: { id: string; affordable: boolean; onBuy: () => void }) {
  const def = voucherDef(id as Parameters<typeof voucherDef>[0])
  return (
    <SlotShell
      borderColor="#facc15"
      icon={def.icon}
      title={def.name}
      subtitle="Voucher"
      description={def.description}
      actionLabel={`Buy $${def.cost}`}
      affordable={affordable}
      onAction={onBuy}
    />
  )
}

function optionDisplay(option: PackOption): { icon: string; name: string; description: string; borderColor: string } {
  if (option.kind === 'tarot') {
    const def = tarotCard(option.id)
    return { icon: def.icon, name: def.name, description: def.description, borderColor: '#818cf8' }
  }
  if (option.kind === 'planet') {
    const def = planetCard(option.id)
    return {
      icon: def.icon,
      name: def.name,
      description: `Levels up ${handTypeDef(def.handType).label} instantly.`,
      borderColor: '#38bdf8',
    }
  }
  if (option.kind === 'spectral') {
    const def = spectralCard(option.id)
    return { icon: def.icon, name: def.name, description: def.description, borderColor: '#a3a3a3' }
  }
  if (option.kind === 'playing_card') {
    return {
      icon: '🃏',
      name: `${rankLabel(option.card.rank)}${suitSymbol(option.card.suit)}`,
      description: 'Adds this card to your deck.',
      borderColor: '#71717a',
    }
  }
  const def = catDef(option.id)
  return { icon: def.icon, name: def.name, description: def.description, borderColor: RARITY_COLORS[def.rarity] }
}

function optionNeedsTargets(option: PackOption): boolean {
  if (option.kind === 'tarot') return tarotCard(option.id).minTargets > 0
  if (option.kind === 'spectral') return spectralCard(option.id).minTargets > 0
  return false
}

function PackOpeningPanel() {
  const run = useGameStore((s) => s.run)
  const choosePack = useGameStore((s) => s.choosePack)
  const skipPack = useGameStore((s) => s.skipPack)
  const toggleCard = useGameStore((s) => s.toggleCard)
  const clearCardSelection = useGameStore((s) => s.clearCardSelection)

  const [targetingOptionId, setTargetingOptionId] = useState<string | null>(null)
  const opening = run.packOpening!

  const targetingEntry = targetingOptionId ? opening.options.find((o) => o.optionId === targetingOptionId) : undefined
  const targetingDef = targetingEntry
    ? targetingEntry.option.kind === 'tarot'
      ? tarotCard(targetingEntry.option.id)
      : targetingEntry.option.kind === 'spectral'
        ? spectralCard(targetingEntry.option.id)
        : null
    : null

  function pick(optionId: string, option: PackOption) {
    if (optionNeedsTargets(option)) {
      clearCardSelection()
      setTargetingOptionId(optionId)
      return
    }
    choosePack(optionId, [])
  }

  function confirmTargeting() {
    if (!targetingOptionId) return
    choosePack(targetingOptionId, run.selectedIds)
    setTargetingOptionId(null)
  }

  function cancelTargeting() {
    clearCardSelection()
    setTargetingOptionId(null)
  }

  const canConfirm =
    !!targetingDef && run.selectedIds.length >= targetingDef.minTargets && run.selectedIds.length <= targetingDef.maxTargets

  if (targetingDef) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-indigo-500 bg-zinc-900 p-6">
        <div className="text-center text-sm text-indigo-300">
          {targetingDef.icon} {targetingDef.name}: select{' '}
          {targetingDef.minTargets === targetingDef.maxTargets
            ? targetingDef.minTargets
            : `${targetingDef.minTargets}-${targetingDef.maxTargets}`}{' '}
          card(s) from your hand ({run.selectedIds.length} selected)
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {run.hand.map((card) => (
            <Card key={card.id} card={card} selected={run.selectedIds.includes(card.id)} onClick={() => toggleCard(card.id)} />
          ))}
        </div>
        {run.hand.length === 0 && <div className="text-sm text-zinc-500 italic">Your hand is empty right now.</div>}
        <div className="flex gap-3">
          <button type="button" onClick={cancelTargeting} className="rounded-lg bg-zinc-700 px-4 py-2 font-semibold hover:bg-zinc-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmTargeting}
            disabled={!canConfirm}
            className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-indigo-400"
          >
            Confirm
          </button>
        </div>
      </div>
    )
  }

  const maxCatSlots = effectiveMaxCatSlots(run.bonusCatSlots)
  const catSlotsFull = ownedCatSlotCount(run.ownedCats) >= maxCatSlots

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-indigo-500 bg-zinc-900 p-6">
      <div className="text-center text-lg font-bold">{packLabel(opening.category, opening.size)}</div>
      <div className="text-center text-sm text-zinc-400">Choose {opening.chooseRemaining} more</div>
      <div className="flex flex-wrap justify-center gap-3">
        {opening.options.map((entry) => {
          const display = optionDisplay(entry.option)
          const disabled = entry.option.kind === 'joker' && catSlotsFull
          return (
            <div
              key={entry.optionId}
              className="flex w-36 flex-col items-center gap-2 rounded-lg border-2 bg-zinc-800 p-3 text-center"
              style={{ borderColor: display.borderColor }}
            >
              <span className="text-2xl">{display.icon}</span>
              <span className="text-xs font-semibold">{display.name}</span>
              <span className="text-[11px] leading-tight text-zinc-400">{display.description}</span>
              <button
                type="button"
                onClick={() => pick(entry.optionId, entry.option)}
                disabled={disabled}
                title={disabled ? 'No room for a new Cat' : undefined}
                className="mt-1 w-full rounded bg-indigo-500 px-2 py-1 text-xs font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-indigo-400"
              >
                Choose
              </button>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={skipPack} className="rounded-lg bg-zinc-700 px-4 py-2 font-semibold hover:bg-zinc-600">
        Done
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
  const openPack = useGameStore((s) => s.openPack)
  const buyVoucherOffer = useGameStore((s) => s.buyVoucherOffer)

  if (run.packOpening) {
    return (
      <div className="flex flex-col gap-6 rounded-lg bg-zinc-900 p-6">
        <PackOpeningPanel />
      </div>
    )
  }

  const cost = rerollCost(run.rerollsUsedThisShop, run.ownedVouchers)
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
              affordable={run.money >= voucherDef(run.voucherOffer).cost}
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
