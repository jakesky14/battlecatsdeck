import { describe, expect, it } from 'vitest'
import { TAROT_CARDS, tarotCard } from '../tarots'

describe('TAROT_CARDS', () => {
  it('has 13 unique cards (the 9 enhancement/edition-dependent cards are intentionally excluded for now)', () => {
    expect(TAROT_CARDS).toHaveLength(13)
    expect(new Set(TAROT_CARDS.map((t) => t.id)).size).toBe(13)
  })

  it('does not include any of the enhancement/edition-dependent cards yet', () => {
    const blocked = [
      'magician',
      'empress',
      'hierophant',
      'lovers',
      'chariot',
      'justice',
      'wheel_of_fortune',
      'devil',
      'tower',
    ]
    for (const id of blocked) {
      expect(TAROT_CARDS.some((t) => t.id === id)).toBe(false)
    }
  })

  it('every card has consistent target bounds (0 or minTargets >= 1, minTargets <= maxTargets)', () => {
    for (const card of TAROT_CARDS) {
      expect(card.minTargets).toBeLessThanOrEqual(card.maxTargets)
      if (card.maxTargets === 0) expect(card.minTargets).toBe(0)
    }
  })

  it('looks up a card by id and throws for an unknown one', () => {
    expect(tarotCard('death').name).toBe('Death')
    expect(() => tarotCard('nonexistent')).toThrow()
  })
})
