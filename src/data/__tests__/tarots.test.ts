import { describe, expect, it } from 'vitest'
import { TAROT_CARDS, tarotCard } from '../tarots'

describe('TAROT_CARDS', () => {
  it('has all 22 unique cards', () => {
    expect(TAROT_CARDS).toHaveLength(22)
    expect(new Set(TAROT_CARDS.map((t) => t.id)).size).toBe(22)
  })

  it('every card has consistent target bounds (0 or minTargets >= 1, minTargets <= maxTargets)', () => {
    for (const card of TAROT_CARDS) {
      expect(card.minTargets).toBeLessThanOrEqual(card.maxTargets)
      if (card.maxTargets === 0) expect(card.minTargets).toBe(0)
    }
  })

  it('the 8 enhancement cards require targets and carry the right enhancement', () => {
    const expected: Record<string, string> = {
      magician: 'lucky',
      empress: 'mult',
      hierophant: 'bonus',
      lovers: 'wild',
      chariot: 'steel',
      justice: 'glass',
      devil: 'gold',
      tower: 'stone',
    }
    for (const [id, enhancement] of Object.entries(expected)) {
      const card = tarotCard(id)
      expect(card.enhancement).toBe(enhancement)
      expect(card.minTargets).toBeGreaterThanOrEqual(1)
    }
  })

  it('looks up a card by id and throws for an unknown one', () => {
    expect(tarotCard('death').name).toBe('Death')
    expect(() => tarotCard('nonexistent')).toThrow()
  })
})
