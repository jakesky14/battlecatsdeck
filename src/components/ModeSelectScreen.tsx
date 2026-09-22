import { useGameStore } from '../state/useGameStore'

export function ModeSelectScreen() {
  const pickMode = useGameStore((s) => s.pickMode)

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg bg-zinc-900 p-8 text-center">
      <div className="text-2xl font-bold">Choose Your Mode</div>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => pickMode('enemy')}
          className="flex flex-col items-center gap-2 rounded-lg border-2 border-zinc-700 bg-zinc-800 p-5 text-center transition-colors hover:border-yellow-400"
        >
          <span className="text-4xl">🐕</span>
          <span className="text-lg font-bold">Enemy Battle</span>
          <span className="text-sm text-zinc-400">
            Every blind is an enemy with an HP bar. Your chips × mult is damage dealt — whittle them down to
            win the round.
          </span>
        </button>
        <button
          type="button"
          onClick={() => pickMode('classic')}
          className="flex flex-col items-center gap-2 rounded-lg border-2 border-zinc-700 bg-zinc-800 p-5 text-center transition-colors hover:border-yellow-400"
        >
          <span className="text-4xl">🃏</span>
          <span className="text-lg font-bold">Classic</span>
          <span className="text-sm text-zinc-400">
            The original Balatro style — each blind is a score target. Reach the required chips × mult before
            you run out of hands.
          </span>
        </button>
      </div>
    </div>
  )
}
