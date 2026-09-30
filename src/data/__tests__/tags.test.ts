import { describe, expect, it } from 'vitest'
import { TAGS, tagDef } from '../tags'

describe('TAGS', () => {
  it('has all 24 unique tags', () => {
    expect(TAGS).toHaveLength(24)
    expect(new Set(TAGS.map((t) => t.id)).size).toBe(24)
  })

  const unlockGated = ['rare', 'foil', 'holographic', 'polychrome', 'negative']

  it('11 baseline tags are available at any Ante (unlock-gated ones aside)', () => {
    const anyAnte = TAGS.filter((t) => t.minAnte === 1 && !unlockGated.includes(t.id))
    expect(anyAnte.map((t) => t.id).sort()).toEqual(
      ['boss', 'charm', 'coupon', 'double', 'd6', 'economy', 'investment', 'juggle', 'speed', 'uncommon', 'voucher'].sort(),
    )
  })

  it('8 baseline tags require Ante 2+ (unlock-gated Negative aside)', () => {
    const ante2Plus = TAGS.filter((t) => t.minAnte === 2 && !unlockGated.includes(t.id))
    const ids = ante2Plus.map((t) => t.id)
    expect(ids).toHaveLength(8)
    expect(ids).toContain('standard')
    expect(ids).toContain('meteor')
    expect(ids).toContain('buffoon')
    expect(ids).toContain('handy')
    expect(ids).toContain('garbage')
    expect(ids).toContain('ethereal')
    expect(ids).toContain('top_up')
    expect(ids).toContain('orbital')
  })

  it('the 5 unlock-gated tags are exactly Rare/Foil/Holographic/Polychrome/Negative', () => {
    expect(unlockGated.every((id) => TAGS.some((t) => t.id === id))).toBe(true)
    expect(TAGS.filter((t) => unlockGated.includes(t.id))).toHaveLength(5)
  })

  it('Rare/Foil/Holographic/Polychrome are any-Ante, Negative is Ante 2+', () => {
    expect(tagDef('rare').minAnte).toBe(1)
    expect(tagDef('foil').minAnte).toBe(1)
    expect(tagDef('holographic').minAnte).toBe(1)
    expect(tagDef('polychrome').minAnte).toBe(1)
    expect(tagDef('negative').minAnte).toBe(2)
  })

  it('looks up a tag by id and throws for an unknown one', () => {
    expect(tagDef('economy').name).toBe('Economy Tag')
    expect(() => tagDef('nonexistent' as never)).toThrow()
  })
})
