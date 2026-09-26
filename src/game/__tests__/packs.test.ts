import { describe, expect, it } from 'vitest'
import {
  PACK_CONTENTS,
  PACK_VARIANT_WEIGHTS,
  effectiveMaxCatSlots,
  generatePackOptions,
  resolvePackOption,
  rollPackVariant,
  type PackGenContext,
} from '../packs'
import { createInitialRunState } from '../runState'
import { MAX_CAT_SLOTS } from '../shop'

const low = () => 0
const high = () => 1 - 1e-9

function ctx(overrides: Partial<PackGenContext> = {}): PackGenContext {
  return {
    excludeCatIds: [],
    handTypePlayCounts: createInitialRunState().handTypePlayCounts,
    hasTelescope: false,
    hasHone: false,
    ...overrides,
  }
}

describe('pack variant odds', () => {
  it('sum to 100 across all 15 variants', () => {
    const total = Object.values(PACK_VARIANT_WEIGHTS).reduce((sum, w) => sum + w, 0)
    expect(total).toBeCloseTo(100, 5)
  })

  it('rolls a valid category/size pair', () => {
    const { category, size } = rollPackVariant(low)
    expect(PACK_CONTENTS[category][size]).toBeDefined()
  })
})

describe('generatePackOptions', () => {
  it('arcana normal: 3 tarot options, choose 1', () => {
    const options = generatePackOptions('arcana', 'normal', ctx(), low)
    expect(options).toHaveLength(3)
    expect(options.every((o) => o.option.kind === 'tarot')).toBe(true)
    expect(PACK_CONTENTS.arcana.normal.choose).toBe(1)
  })

  it('celestial mega: 5 planet options, choose 2', () => {
    const options = generatePackOptions('celestial', 'mega', ctx(), low)
    expect(options).toHaveLength(5)
    expect(options.every((o) => o.option.kind === 'planet')).toBe(true)
    expect(PACK_CONTENTS.celestial.mega.choose).toBe(2)
  })

  it('celestial pack with Telescope guarantees the most-played hand type\'s Planet', () => {
    const counts = { ...createInitialRunState().handTypePlayCounts, flush: 10 }
    const options = generatePackOptions('celestial', 'normal', ctx({ hasTelescope: true, handTypePlayCounts: counts }), low)
    const first = options[0]
    expect(first.option.kind).toBe('planet')
    if (first.option.kind === 'planet') expect(first.option.id).toBe('jupiter')
  })

  it('spectral normal: 2 options, choose 1', () => {
    const options = generatePackOptions('spectral', 'normal', ctx(), low)
    expect(options).toHaveLength(2)
    expect(options.every((o) => o.option.kind === 'spectral')).toBe(true)
  })

  it('standard jumbo: 5 playing card options, choose 1', () => {
    const options = generatePackOptions('standard', 'jumbo', ctx(), low)
    expect(options).toHaveLength(5)
    expect(options.every((o) => o.option.kind === 'playing_card')).toBe(true)
    expect(PACK_CONTENTS.standard.jumbo.choose).toBe(1)
  })

  it('buffoon mega: up to 5 joker options, choose 2', () => {
    const options = generatePackOptions('buffoon', 'mega', ctx(), high)
    expect(options.length).toBeGreaterThan(0)
    expect(options.every((o) => o.option.kind === 'joker')).toBe(true)
    expect(PACK_CONTENTS.buffoon.mega.choose).toBe(2)
  })

  it('buffoon pack never offers duplicate jokers within itself', () => {
    const options = generatePackOptions('buffoon', 'jumbo', ctx(), low)
    const ids = options.map((o) => (o.option.kind === 'joker' ? o.option.id : null))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('resolvePackOption', () => {
  it('planet option levels up its hand type instantly', () => {
    const state = createInitialRunState()
    const { state: next, message } = resolvePackOption({ kind: 'planet', id: 'pluto' }, state, [])
    expect(next.handLevels.high_card).toBe(2)
    expect(message).toContain('Pluto')
  })

  it('playing_card option adds the card to extraCards', () => {
    const state = createInitialRunState()
    const card = { id: 'extra-test', suit: 'hearts' as const, rank: 5 as const }
    const { state: next } = resolvePackOption({ kind: 'playing_card', card }, state, [])
    expect(next.extraCards).toContainEqual(card)
  })

  it('joker option recruits the Cat if there is room', () => {
    const state = createInitialRunState()
    const { state: next, message } = resolvePackOption({ kind: 'joker', id: 'cat' }, state, [])
    expect(next.ownedCats).toHaveLength(1)
    expect(message).toContain('Recruited')
  })

  it('joker option refuses when Cat slots are full', () => {
    const state = {
      ...createInitialRunState(),
      ownedCats: Array.from({ length: effectiveMaxCatSlots(0) }, (_, i) => ({
        instanceId: `cat-${i}`,
        defId: 'cat',
        disabledThisRound: false,
      })),
    }
    const { state: next, message } = resolvePackOption({ kind: 'joker', id: 'tank_cat' }, state, [])
    expect(next.ownedCats).toHaveLength(effectiveMaxCatSlots(0))
    expect(message).toContain('No room')
  })
})

describe('effectiveMaxCatSlots', () => {
  it('adds bonus slots to the base max', () => {
    expect(effectiveMaxCatSlots(0)).toBe(MAX_CAT_SLOTS)
    expect(effectiveMaxCatSlots(2)).toBe(MAX_CAT_SLOTS + 2)
  })
})
