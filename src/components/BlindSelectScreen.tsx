import { CatRow } from './CatRow'
import { ClassicBlindPanel } from './ClassicBlindPanel'
import { ConsumablesPanel } from './ConsumablesPanel'
import { EnemyPanel } from './EnemyPanel'
import { bossBlindForAnte, getEnemyForBlind } from '../game/blinds'
import { useGameStore } from '../state/useGameStore'

export function BlindSelectScreen() {
  const run = useGameStore((s) => s.run)
  const playBlind = useGameStore((s) => s.playBlind)
  const skip = useGameStore((s) => s.skip)
  const useCard = useGameStore((s) => s.useCard)

  const enemy = getEnemyForBlind(run.ante, run.blind)
  const bossDescription = run.blind === 'boss' ? bossBlindForAnte(run.ante).description : undefined

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg bg-zinc-900 p-8 text-center">
      {run.message && <div className="text-lg font-semibold text-green-400">{run.message}</div>}
      <div className="text-sm text-zinc-400">Ante {run.ante}</div>

      {run.mode === 'enemy' ? (
        <EnemyPanel enemy={enemy} maxHp={run.target} currentHp={run.target} />
      ) : (
        <ClassicBlindPanel
          blind={run.blind}
          ante={run.ante}
          target={run.target}
          score={0}
          description={bossDescription}
        />
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={playBlind}
          className="rounded-lg bg-yellow-500 px-6 py-2 font-semibold text-zinc-900 hover:bg-yellow-400"
        >
          {run.mode === 'enemy' ? 'Fight' : 'Play'}
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

      <div className="w-full">
        <div className="mb-2 text-sm font-semibold text-zinc-300">Consumables</div>
        <ConsumablesPanel
          consumables={run.consumables}
          phase={run.phase}
          onUse={(instanceId) => useCard(instanceId, [])}
        />
      </div>
    </div>
  )
}
