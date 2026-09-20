import { Card } from './Card'
import { CatRow } from './CatRow'
import { evaluateHand } from '../game/handEvaluator'
import { handTypeDef } from '../data/handTypes'
import { useGameStore } from '../state/useGameStore'

export function PlayingScreen() {
  const run = useGameStore((s) => s.run)
  const toggleCard = useGameStore((s) => s.toggleCard)
  const play = useGameStore((s) => s.play)
  const discard = useGameStore((s) => s.discard)

  const selectedCards = run.hand.filter((c) => run.selectedIds.includes(c.id))
  const preview = selectedCards.length > 0 ? evaluateHand(selectedCards) : null
  const previewDef = preview ? handTypeDef(preview.handType) : null

  const remaining = run.target - run.roundScore

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Score</div>
            <div className="text-2xl font-bold">
              {run.roundScore} <span className="text-zinc-500">/ {run.target}</span>
            </div>
            {remaining > 0 && <div className="text-xs text-zinc-500">{remaining} to go</div>}
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-sm text-zinc-400">Hands</div>
              <div className="text-xl font-bold">{run.handsRemaining}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-400">Discards</div>
              <div className="text-xl font-bold">{run.discardsRemaining}</div>
            </div>
          </div>
        </div>
        {run.catsDisabledThisRound && (
          <div className="mt-2 rounded bg-red-950 px-2 py-1 text-xs text-red-300">
            This boss has disabled all Cat abilities for the round!
          </div>
        )}
        {run.lastResult && (
          <div className="mt-2 text-sm text-zinc-400">
            Last play: {handTypeDef(run.lastResult.handType).label} — {run.lastResult.chips} chips ×{' '}
            {run.lastResult.mult} mult = {run.lastResult.total}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-zinc-900 p-3">
        <div className="mb-2 text-sm font-semibold text-zinc-300">Your Cats</div>
        <CatRow ownedCats={run.ownedCats} />
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg bg-zinc-900 p-4">
        <div className="h-6 text-sm text-zinc-400">
          {previewDef
            ? `${previewDef.label} — base ${previewDef.baseChips} chips × ${previewDef.baseMult} mult`
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
            Play Hand
          </button>
        </div>
      </div>
    </div>
  )
}
