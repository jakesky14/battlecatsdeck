import { BlindSelectScreen } from './components/BlindSelectScreen'
import { EndScreen } from './components/EndScreen'
import { PlayingScreen } from './components/PlayingScreen'
import { ShopScreen } from './components/ShopScreen'
import { TopBar } from './components/TopBar'
import { useGameStore } from './state/useGameStore'

function App() {
  const run = useGameStore((s) => s.run)

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">🐱 Battle Cats Deck</h1>
      </header>

      {run.phase !== 'game-over' && run.phase !== 'victory' && <TopBar run={run} />}

      {run.phase === 'blind-select' && <BlindSelectScreen />}
      {run.phase === 'playing' && <PlayingScreen />}
      {run.phase === 'shop' && <ShopScreen />}
      {run.phase === 'game-over' && <EndScreen victory={false} />}
      {run.phase === 'victory' && <EndScreen victory={true} />}
    </div>
  )
}

export default App
