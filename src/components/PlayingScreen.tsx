import { Card } from './Card'
import { CatRow } from './CatRow'
import { ClassicBlindPanel } from './ClassicBlindPanel'
import { EnemyPanel } from './EnemyPanel'
import { bossBlindForAnte, getEnemyForBlind } from '../game/blinds'
import { suitSymbol } from '../game/cards'
import { evaluateHand } from '../game/handEvaluator'
import { handTypeAtLevel, handTypeDef } from '../data/handTypes'
import { useGameStore } from '../state/useGameStore'

export function PlayingScreen() {
  const run = useGameStore((s) => s.run)
  const toggleCard = useGameStore((s) => s.toggleCard)
  const play = useGameStore((s) => s.play)
  const discard = useGameStore((s) => s.discard)

  const selectedCards = run.hand.filter((c) => run.selectedIds.includes(c.id))
  const preview = selectedCards.length > 0 ? evaluateHand(selectedCards) : null
  const previewDef = preview ? handTypeDef(preview.handType) : null
  const previewLevel = preview ? run.handLevels[preview.handType] ?? 1 : 1
  const previewAtLevel = preview ? handTypeAtLevel(preview.handType, previewLevel) : null

  const enemy = getEnemyForBlind(run.ante, run.blind)
  const currentHp = run.target - run.roundScore
  const bossDescription = run.blind === 'boss' ? bossBlindForAnte(run.ante).description : undefined
  const isEnemyMode = run.mode === 'enemy'

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
        <CatRow ownedCats={run.ownedCats} />
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg bg-zinc-900 p-4">
        <div className="h-6 text-sm text-zinc-400">
          {previewDef && previewAtLevel
            ? `${previewDef.label} Lv.${previewLevel} — base ${previewAtLevel.chips} chips × ${previewAtLevel.mult} mult`
            : 'Select up to 5 cards'}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {run.hand.map((card) => (
            <Card
              key={card.id}
              card={card}
              selected={run.selectedIds.includes(card.id)}
              onClick={() => toggleCard(card.id)}
            />
          ))}
        </div>
        {run.bannedSuitThisRound && (
          <div className="text-xs text-red-400">
            {suitSymbol(run.bannedSuitThisRound)} cards score 0 Chips this round
          </div>
        )}
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
      </div>
    </div>
  )
}
