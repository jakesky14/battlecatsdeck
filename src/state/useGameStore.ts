import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  buyShopSlot,
  chooseMode,
  clearSelection,
  createInitialRunState,
  discardSelected,
  leaveShop,
  playHand,
  reorderHand,
  rerollShop,
  sellCat,
  skipBlind,
  startRound,
  toggleSelect,
  useConsumable,
  type GameMode,
  type RunState,
} from '../game/runState'

interface GameStore {
  run: RunState
  startNewRun: () => void
  pickMode: (mode: GameMode) => void
  playBlind: () => void
  skip: () => void
  toggleCard: (cardId: string) => void
  play: () => void
  discard: () => void
  buy: (slotId: string) => void
  sell: (instanceId: string) => void
  reroll: () => void
  leave: () => void
  useCard: (instanceId: string, targetIds: string[]) => void
  moveCard: (cardId: string, direction: 'left' | 'right') => void
  clearCardSelection: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      run: createInitialRunState(),
      startNewRun: () => set({ run: createInitialRunState() }),
      pickMode: (mode) => set((s) => ({ run: chooseMode(s.run, mode) })),
      playBlind: () => set((s) => ({ run: startRound(s.run) })),
      skip: () => set((s) => ({ run: skipBlind(s.run) })),
      toggleCard: (cardId) => set((s) => ({ run: toggleSelect(s.run, cardId) })),
      play: () => set((s) => ({ run: playHand(s.run) })),
      discard: () => set((s) => ({ run: discardSelected(s.run) })),
      buy: (slotId) => set((s) => ({ run: buyShopSlot(s.run, slotId) })),
      sell: (instanceId) => set((s) => ({ run: sellCat(s.run, instanceId) })),
      reroll: () => set((s) => ({ run: rerollShop(s.run) })),
      leave: () => set((s) => ({ run: leaveShop(s.run) })),
      useCard: (instanceId, targetIds) => set((s) => ({ run: useConsumable(s.run, instanceId, targetIds) })),
      moveCard: (cardId, direction) => set((s) => ({ run: reorderHand(s.run, cardId, direction) })),
      clearCardSelection: () => set((s) => ({ run: clearSelection(s.run) })),
    }),
    { name: 'battlecatsdeck-run-v4' },
  ),
)
