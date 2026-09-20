import { useGameStore } from '../state/useGameStore'

export function EndScreen({ victory }: { victory: boolean }) {
  const run = useGameStore((s) => s.run)
  const startNewRun = useGameStore((s) => s.startNewRun)

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-zinc-900 p-10 text-center">
      <div className={`text-4xl font-bold ${victory ? 'text-yellow-400' : 'text-red-400'}`}>
        {victory ? 'You beat the game!' : 'Game Over'}
      </div>
      <div className="text-zinc-400">
        {victory
          ? 'The cats have conquered every ante.'
          : `Defeated at Ante ${run.ante} with ${run.ownedCats.length} cats recruited.`}
      </div>
      <button
        type="button"
        onClick={startNewRun}
        className="mt-4 rounded-lg bg-yellow-500 px-6 py-2 font-semibold text-zinc-900 hover:bg-yellow-400"
      >
        New Run
      </button>
    </div>
  )
}
