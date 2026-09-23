import { describe, expect, it } from 'vitest'
import { openPack, effectiveMaxCatSlots } from '../packs'
import { createInitialRunState, type RunState } from '../runState'
import { MAX_CAT_SLOTS } from '../shop'
import type { OwnedCat } from '../cats/types'

const low = () => 0
const high = () => 1 - 1e-9

function owned(defId: string, index = 0): OwnedCat {
  return { instanceId: `${defId}-inst-${index}`, defId, disabledThisRound: false }
}

describe('openPack', () => {
  it('planet: low roll levels up Pluto (High Card)', () => {
    const state = createInitialRunState()
    const { state: next, message } = openPack('planet', state, low)
    expect(next.handLevels.high_card).toBe(2)
    expect(message).toContain('Pluto')
    expect(message).toContain('leveled up')
  })

  it('planet: high roll levels up Eris (Flush Five)', () => {
    const state = createInitialRunState()
    const { state: next, message } = openPack('planet', state, high)
    expect(next.handLevels.flush_five).toBe(2)
    expect(message).toContain('Eris')
  })

  it('planet: records itself as the last consumable used, for The Fool', () => {
    const state = createInitialRunState()
    const { state: next } = openPack('planet', state, low)
    expect(next.lastConsumableUsed).toEqual({ kind: 'planet', id: 'pluto' })
  })

  it('spectral: grants a free cat when no cats are owned yet', () => {
    const state = createInitialRunState()
    const { state: next, message } = openPack('spectral', state, low)
    // duplicate is unavailable with 0 owned cats, so the low roll lands on free_cat
    expect(next.ownedCats.length).toBe(1)
    expect(message).toContain('Recruited')
  })

  it('spectral: falls back away from duplicate/free_cat when slots are full', () => {
    const full: RunState = {
      ...createInitialRunState(),
      ownedCats: Array.from({ length: effectiveMaxCatSlots(0) }, (_, i) => owned('cat', i)),
    }
    const { state: next } = openPack('spectral', full, low)
    // with slots full, low roll should land on level_all (first remaining choice)
    expect(Object.values(next.handLevels).every((lvl) => lvl === 2)).toBe(true)
  })
})

describe('effectiveMaxCatSlots', () => {
  it('adds bonus slots to the base max', () => {
    expect(effectiveMaxCatSlots(0)).toBe(MAX_CAT_SLOTS)
    expect(effectiveMaxCatSlots(2)).toBe(MAX_CAT_SLOTS + 2)
  })
})
