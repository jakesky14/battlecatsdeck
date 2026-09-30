import { useState } from 'react'
import { Card } from './Card'
import { catDef } from '../game/cats/roster'
import { RARITY_COLORS, ownedCatSlotCount } from '../game/cats/types'
import { rankLabel, suitSymbol } from '../game/cards'
import { tarotCard } from '../data/tarots'
import { planetCard } from '../data/planets'
import { spectralCard } from '../data/spectrals'
import { handTypeDef } from '../data/handTypes'
import { effectiveMaxCatSlots, packLabel, type PackOption } from '../game/packs'
import { useGameStore } from '../state/useGameStore'

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

/** Renders whenever run.packOpening is set — a Buffoon/Arcana/Celestial/
 *  Spectral/Standard Pack being opened, whether bought from the shop or
 *  granted instantly by a Tag (Charm/Standard/Meteor/Buffoon/Ethereal). */
export function PackOpeningPanel() {
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
