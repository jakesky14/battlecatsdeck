import { describe, expect, it } from 'vitest'
import { HAND_TYPES, handTypeAtLevel } from '../handTypes'
import { PLANET_CARDS, planetCard, planetForHandType } from '../planets'

describe('PLANET_CARDS', () => {
  it('has exactly 12 cards, one per hand type, with no duplicates', () => {
    expect(PLANET_CARDS).toHaveLength(12)
    expect(new Set(PLANET_CARDS.map((p) => p.id)).size).toBe(12)

    const handTypeIds = HAND_TYPES.map((h) => h.id)
    const coveredHandTypes = PLANET_CARDS.map((p) => p.handType)
    expect(new Set(coveredHandTypes)).toEqual(new Set(handTypeIds))
    expect(new Set(coveredHandTypes).size).toBe(12)
  })

  it('looks up a card by id', () => {
    expect(planetCard('eris').handType).toBe('flush_five')
  })

  it('finds the card for a given hand type', () => {
    expect(planetForHandType('straight')?.name).toBe('Saturn')
  })
})

describe('Planet card level-up values match the published table', () => {
  it('Pluto: High Card +1 Mult / +10 Chips per level', () => {
    const at2 = handTypeAtLevel('high_card', 2)
    const at1 = handTypeAtLevel('high_card', 1)
    expect(at2.mult - at1.mult).toBe(1)
    expect(at2.chips - at1.chips).toBe(10)
  })

  it('Mercury: Pair +1 Mult / +15 Chips per level', () => {
    const at2 = handTypeAtLevel('pair', 2)
    const at1 = handTypeAtLevel('pair', 1)
    expect(at2.mult - at1.mult).toBe(1)
    expect(at2.chips - at1.chips).toBe(15)
  })

  it('Uranus: Two Pair +1 Mult / +20 Chips per level', () => {
    const at2 = handTypeAtLevel('two_pair', 2)
    const at1 = handTypeAtLevel('two_pair', 1)
    expect(at2.mult - at1.mult).toBe(1)
    expect(at2.chips - at1.chips).toBe(20)
  })

  it('Venus: Three of a Kind +2 Mult / +20 Chips per level', () => {
    const at2 = handTypeAtLevel('three_of_a_kind', 2)
    const at1 = handTypeAtLevel('three_of_a_kind', 1)
    expect(at2.mult - at1.mult).toBe(2)
    expect(at2.chips - at1.chips).toBe(20)
  })

  it('Saturn: Straight +3 Mult / +30 Chips per level', () => {
    const at2 = handTypeAtLevel('straight', 2)
    const at1 = handTypeAtLevel('straight', 1)
    expect(at2.mult - at1.mult).toBe(3)
    expect(at2.chips - at1.chips).toBe(30)
  })

  it('Jupiter: Flush +2 Mult / +15 Chips per level', () => {
    const at2 = handTypeAtLevel('flush', 2)
    const at1 = handTypeAtLevel('flush', 1)
    expect(at2.mult - at1.mult).toBe(2)
    expect(at2.chips - at1.chips).toBe(15)
  })

  it('Earth: Full House +2 Mult / +25 Chips per level', () => {
    const at2 = handTypeAtLevel('full_house', 2)
    const at1 = handTypeAtLevel('full_house', 1)
    expect(at2.mult - at1.mult).toBe(2)
    expect(at2.chips - at1.chips).toBe(25)
  })

  it('Mars: Four of a Kind +3 Mult / +30 Chips per level', () => {
    const at2 = handTypeAtLevel('four_of_a_kind', 2)
    const at1 = handTypeAtLevel('four_of_a_kind', 1)
    expect(at2.mult - at1.mult).toBe(3)
    expect(at2.chips - at1.chips).toBe(30)
  })

  it('Neptune: Straight Flush +4 Mult / +40 Chips per level', () => {
    const at2 = handTypeAtLevel('straight_flush', 2)
    const at1 = handTypeAtLevel('straight_flush', 1)
    expect(at2.mult - at1.mult).toBe(4)
    expect(at2.chips - at1.chips).toBe(40)
  })

  it('Planet X: Five of a Kind +3 Mult / +35 Chips per level', () => {
    const at2 = handTypeAtLevel('five_of_a_kind', 2)
    const at1 = handTypeAtLevel('five_of_a_kind', 1)
    expect(at2.mult - at1.mult).toBe(3)
    expect(at2.chips - at1.chips).toBe(35)
  })

  it('Ceres: Flush House +4 Mult / +40 Chips per level', () => {
    const at2 = handTypeAtLevel('flush_house', 2)
    const at1 = handTypeAtLevel('flush_house', 1)
    expect(at2.mult - at1.mult).toBe(4)
    expect(at2.chips - at1.chips).toBe(40)
  })

  it('Eris: Flush Five +3 Mult / +50 Chips per level', () => {
    const at2 = handTypeAtLevel('flush_five', 2)
    const at1 = handTypeAtLevel('flush_five', 1)
    expect(at2.mult - at1.mult).toBe(3)
    expect(at2.chips - at1.chips).toBe(50)
  })
})
