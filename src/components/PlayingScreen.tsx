import { useState } from 'react'
import { Card } from './Card'
import { CatRow } from './CatRow'
import { ClassicBlindPanel } from './ClassicBlindPanel'
import { ConsumablesPanel } from './ConsumablesPanel'
import { EnemyPanel } from './EnemyPanel'
import { bossBlindForAnte, getEnemyForBlind } from '../game/blinds'
import { suitSymbol } from '../game/cards'
import { tarotCard } from '../data/tarots'
import { spectralCard } from '../data/spectrals'
import { evaluateHand } from '../game/handEvaluator'
import { handTypeAtLevel, handTypeDef } from '../data/handTypes'
import { useGameStore } from '../state/useGameStore'

export function PlayingScreen() {
  const run = useGameStore((s) => s.run)
  const toggleCard = useGameStore((s) => s.toggleCard)
  const play = useGameStore((s) => s.play)
  const discard = useGameStore((s) => s.discard)
  const useCard = useGameStore((s) => s.useCard)
  const sellCard = useGameStore((s) => s.sellCard)
  const moveCard = useGameStore((s) => s.moveCard)
  const moveCat = useGameStore((s) => s.moveCat)
  const clearCardSelection = useGameStore((s) => s.clearCardSelection)

  const [targetingInstanceId, setTargetingInstanceId] = useState<string | null>(null)
  const targetingItem = targetingInstanceId
    ? run.consumables.find((c) => c.instanceId === targetingInstanceId)
    : undefined
  const targetingDef = targetingItem
    ? targetingItem.kind === 'spectral'
      ? spectralCard(targetingItem.cardId)
      : tarotCard(targetingItem.cardId)
    : null

  const selectedCards = run.hand.filter((c) => run.selectedIds.includes(c.id))
  const preview = !targetingDef && selectedCards.length > 0 ? evaluateHand(selectedCards) : null
  const previewDef = preview ? handTypeDef(preview.handType) : null
  const previewLevel = preview ? run.handLevels[preview.handType] ?? 1 : 1
  const previewAtLevel = preview ? handTypeAtLevel(preview.handType, previewLevel) : null

  const enemy = getEnemyForBlind(run.ante, run.blind)
  const currentHp = run.target - run.roundScore
  const bossDescription = run.blind === 'boss' ? bossBlindForAnte(run.ante).description : undefined
  const isEnemyMode = run.mode === 'enemy'

  function startTargeting(instanceId: string) {
    clearCardSelection()
    setTargetingInstanceId(instanceId)
  }

  function cancelTargeting() {
    clearCardSelection()
    setTargetingInstanceId(null)
  }

  function confirmTargeting() {
    if (!targetingInstanceId) return
    useCard(targetingInstanceId, run.selectedIds)
    setTargetingInstanceId(null)
  }

  function handleConsumableUse(instanceId: string) {
    const item = run.consumables.find((c) => c.instanceId === instanceId)
    if (!item) return
    if (item.kind === 'planet') {
      useCard(instanceId, [])
      return
    }
    const def = item.kind === 'spectral' ? spectralCard(item.cardId) : tarotCard(item.cardId)
    if (def.minTargets > 0) {
      startTargeting(instanceId)
    } else {
      useCard(instanceId, [])
    }
  }

  const canConfirmTargeting =
    !!targetingDef &&
    run.selectedIds.length >= targetingDef.minTargets &&
    run.selectedIds.length <= targetingDef.maxTargets

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-zinc-900 p-4">
        {isEnemyMode ? (
          <EnemyPanel enemy={enemy} maxHp={run.target} currentHp={currentHp} />
        ) : (
          <ClassicBlindPanel
            blind={run.blind}
            ante={run.ante}
            target={run.target}
            score={run.roundScore}
            description={bossDescription}
          />
        )}

        <div className="mt-4 flex justify-center gap-6 text-center">
          <div>
            <div className="text-sm text-zinc-400">Hands</div>
            <div className="text-xl font-bold">{run.handsRemaining}</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Discards</div>
            <div className="text-xl font-bold">{run.discardsRemaining}</div>
          </div>
        </div>

        {run.lastResult && (
          <div className="mt-2 text-center text-sm text-zinc-400">
            {handTypeDef(run.lastResult.handType).label} — {run.lastResult.chips} chips ×{' '}
            {run.lastResult.mult} mult ={' '}
            <span className="font-semibold text-red-400">
              {run.lastResult.total} {isEnemyMode ? 'damage' : 'points'}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-zinc-900 p-3">
        <div className="mb-2 text-sm font-semibold text-zinc-300">Your Cats</div>
        <CatRow ownedCats={run.ownedCats} onReorder={moveCat} />
      </div>

      <div className="rounded-lg bg-zinc-900 p-3">
        <div className="mb-2 text-sm font-semibold text-zinc-300">Consumables</div>
        <ConsumablesPanel
          consumables={run.consumables}
          phase={run.phase}
          bonusConsumableSlots={run.bonusConsumableSlots}
          onUse={handleConsumableUse}
          onSell={sellCard}
          busy={!!targetingInstanceId}
        />
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg bg-zinc-900 p-4">
        {targetingDef ? (
          <div className="text-center text-sm text-indigo-300">
            {targetingDef.icon} {targetingDef.name}: select{' '}
            {targetingDef.minTargets === targetingDef.maxTargets
              ? targetingDef.minTargets
              : `${targetingDef.minTargets}-${targetingDef.maxTargets}`}{' '}
            card(s) ({run.selectedIds.length} selected)
          </div>
        ) : (
          <div className="h-6 text-sm text-zinc-400">
            {previewDef && previewAtLevel
              ? `${previewDef.label} Lv.${previewLevel} — base ${previewAtLevel.chips} chips × ${previewAtLevel.mult} mult`
              : 'Select up to 5 cards'}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {run.hand.map((card, index) => (
            <div key={card.id} className="flex flex-col items-center gap-1">
              <Card
                card={card}
                selected={run.selectedIds.includes(card.id)}
                onClick={() => toggleCard(card.id)}
              />
              {!targetingDef && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveCard(card.id, 'left')}
                    disabled={index === 0}
                    aria-label="Move card left"
                    className="rounded bg-zinc-800 px-1.5 text-xs text-zinc-400 disabled:opacity-30 hover:enabled:bg-zinc-700"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCard(card.id, 'right')}
                    disabled={index === run.hand.length - 1}
                    aria-label="Move card right"
                    className="rounded bg-zinc-800 px-1.5 text-xs text-zinc-400 disabled:opacity-30 hover:enabled:bg-zinc-700"
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {run.bannedSuitThisRound && !targetingDef && (
          <div className="text-xs text-red-400">
            {suitSymbol(run.bannedSuitThisRound)} cards score 0 Chips this round
          </div>
        )}

        {targetingDef ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={cancelTargeting}
              className="rounded-lg bg-zinc-700 px-4 py-2 font-semibold hover:bg-zinc-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmTargeting}
              disabled={!canConfirmTargeting}
              className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-indigo-400"
            >
              Confirm
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={discard}
              disabled={run.selectedIds.length === 0 || run.discardsRemaining <= 0}
              className="rounded-lg bg-zinc-700 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-zinc-600"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={play}
              disabled={run.selectedIds.length === 0 || run.handsRemaining <= 0}
              className="rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-yellow-400"
            >
              {isEnemyMode ? 'Attack' : 'Play Hand'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
