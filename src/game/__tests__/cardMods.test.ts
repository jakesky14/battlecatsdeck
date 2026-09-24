import { describe, expect, it } from 'vitest'
import {
  CAT_EDITION_WEIGHTS,
  CARD_EDITION_WEIGHTS,
  editionPriceDelta,
  rollCardEdition,
  rollCatEdition,
} from '../cardMods'

function rngAt(fraction: number): () => number {
  // pickWeighted does Math.floor(rng()*length)-free banding; feed it a fixed roll fraction directly
  return () => fraction
}

describe('rollCatEdition', () => {
  it('rolls Base under the 96% band', () => {
    expect(rollCatEdition(rngAt(0))).toBeUndefined()
    expect(rollCatEdition(rngAt(0.9599))).toBeUndefined()
  })

  it('rolls Foil in the 96-98% band', () => {
    expect(rollCatEdition(rngAt(0.97))).toBe('foil')
  })

  it('rolls Holographic in the 98-99.4% band', () => {
    expect(rollCatEdition(rngAt(0.99))).toBe('holographic')
  })

  it('rolls Polychrome in the 99.4-99.7% band', () => {
    expect(rollCatEdition(rngAt(0.995))).toBe('polychrome')
  })

  it('rolls Negative in the 99.7-100% band', () => {
    expect(rollCatEdition(rngAt(0.999))).toBe('negative')
  })

  it('weights sum to 100', () => {
    expect(Object.values(CAT_EDITION_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(100)
  })
})

describe('rollCardEdition', () => {
  it('never rolls Negative for playing cards', () => {
    expect(rollCardEdition(rngAt(0.999))).not.toBe('negative')
  })

  it('weights sum to 100', () => {
    expect(Object.values(CARD_EDITION_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(100)
  })
})

describe('editionPriceDelta', () => {
  it('returns 0 for no edition', () => {
    expect(editionPriceDelta(undefined)).toBe(0)
  })

  it('matches the published price deltas', () => {
    expect(editionPriceDelta('foil')).toBe(2)
    expect(editionPriceDelta('holographic')).toBe(3)
    expect(editionPriceDelta('polychrome')).toBe(5)
    expect(editionPriceDelta('negative')).toBe(5)
  })
})
