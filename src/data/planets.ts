import type { HandTypeId } from './handTypes'

export interface PlanetCardDef {
  id: string
  name: string
  icon: string
  handType: HandTypeId
}

/** The 12 Planet cards, one per poker hand type, weakest to strongest. */
export const PLANET_CARDS: PlanetCardDef[] = [
  { id: 'pluto', name: 'Pluto', icon: '⚪', handType: 'high_card' },
  { id: 'mercury', name: 'Mercury', icon: '☿️', handType: 'pair' },
  { id: 'uranus', name: 'Uranus', icon: '🔵', handType: 'two_pair' },
  { id: 'venus', name: 'Venus', icon: '♀️', handType: 'three_of_a_kind' },
  { id: 'saturn', name: 'Saturn', icon: '🪐', handType: 'straight' },
  { id: 'jupiter', name: 'Jupiter', icon: '🟠', handType: 'flush' },
  { id: 'earth', name: 'Earth', icon: '🌍', handType: 'full_house' },
  { id: 'mars', name: 'Mars', icon: '♂️', handType: 'four_of_a_kind' },
  { id: 'neptune', name: 'Neptune', icon: '🔷', handType: 'straight_flush' },
  { id: 'planet_x', name: 'Planet X', icon: '❓', handType: 'five_of_a_kind' },
  { id: 'ceres', name: 'Ceres', icon: '🌑', handType: 'flush_house' },
  { id: 'eris', name: 'Eris', icon: '🟣', handType: 'flush_five' },
]

const PLANET_MAP = new Map(PLANET_CARDS.map((p) => [p.id, p]))

export function planetCard(id: string): PlanetCardDef {
  const def = PLANET_MAP.get(id)
  if (!def) throw new Error(`Unknown planet card: ${id}`)
  return def
}

/** The Planet card that levels up a given hand type, if any. */
export function planetForHandType(handType: HandTypeId): PlanetCardDef | undefined {
  return PLANET_CARDS.find((p) => p.handType === handType)
}
