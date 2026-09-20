import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  buyCat,
  createInitialRunState,
  discardSelected,
  leaveShop,
  playHand,
  rerollShop,
  sellCat,
  skipBlind,
  startRound,
  toggleSelect,
  type RunState,
} from '../game/runState'

interface GameStore {
  run: RunState
  startNewRun: () => void
  playBlind: () => void
  skip: () => void
  toggleCard: (cardId: string) => void
  play: () => void
  discard: () => void
  buy: (defId: string) => void
  sell: (instanceId: string) => void
  reroll: () => void
  leave: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      run: createInitialRunState(),
      startNewRun: () => set({ run: createInitialRunState() }),
      playBlind: () => set((s) => ({ run: startRound(s.run) })),
      skip: () => set((s) => ({ run: skipBlind(s.run) })),
      toggleCard: (cardId) => set((s) => ({ run: toggleSelect(s.run, cardId) })),
      play: () => set((s) => ({ run: playHand(s.run) })),
      discard: () => set((s) => ({ run: discardSelected(s.run) })),
      buy: (defId) => set((s) => ({ run: buyCat(s.run, defId) })),
      sell: (instanceId) => set((s) => ({ run: sellCat(s.run, instanceId) })),
      reroll: () => set((s) => ({ run: rerollShop(s.run) })),
      leave: () => set((s) => ({ run: leaveShop(s.run) })),
    }),
    { name: 'battlecatsdeck-run' },
  ),
)
