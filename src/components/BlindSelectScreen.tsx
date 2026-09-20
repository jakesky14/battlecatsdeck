import { CatRow } from './CatRow'
import { blindLabel, bossBlindForAnte } from '../game/blinds'
import { useGameStore } from '../state/useGameStore'

export function BlindSelectScreen() {
  const run = useGameStore((s) => s.run)
  const playBlind = useGameStore((s) => s.playBlind)
  const skip = useGameStore((s) => s.skip)

  const boss = run.blind === 'boss' ? bossBlindForAnte(run.ante) : null

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg bg-zinc-900 p-8 text-center">
      {run.message && <div className="text-lg font-semibold text-green-400">{run.message}</div>}
      <div>
        <div className="text-sm text-zinc-400">Ante {run.ante}</div>
        <div className="text-3xl font-bold">{blindLabel(run.blind, run.ante)}</div>
        <div className="mt-2 text-xl text-yellow-400">Target: {run.target}</div>
        {boss && <div className="mt-2 max-w-sm text-sm text-red-300">{boss.description}</div>}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={playBlind}
          className="rounded-lg bg-yellow-500 px-6 py-2 font-semibold text-zinc-900 hover:bg-yellow-400"
        >
          Play
        </button>
        {run.blind !== 'boss' && (
          <button
            type="button"
            onClick={skip}
            className="rounded-lg bg-zinc-700 px-6 py-2 font-semibold hover:bg-zinc-600"
          >
            Skip (+$1)
          </button>
        )}
      </div>

      <div className="w-full">
        <div className="mb-2 text-sm font-semibold text-zinc-300">Your Cats</div>
        <CatRow ownedCats={run.ownedCats} />
      </div>
    </div>
  )
}
