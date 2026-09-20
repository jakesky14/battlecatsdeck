export type HandTypeId =
  | 'high_card'
  | 'pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'

export interface HandTypeDef {
  id: HandTypeId
  label: string
  baseChips: number
  baseMult: number
}

/** Ordered weakest to strongest. Order also breaks ties when evaluating a played hand. */
export const HAND_TYPES: HandTypeDef[] = [
  { id: 'high_card', label: 'High Card', baseChips: 5, baseMult: 1 },
  { id: 'pair', label: 'Pair', baseChips: 10, baseMult: 2 },
  { id: 'two_pair', label: 'Two Pair', baseChips: 20, baseMult: 2 },
  { id: 'three_of_a_kind', label: 'Three of a Kind', baseChips: 30, baseMult: 3 },
  { id: 'straight', label: 'Straight', baseChips: 30, baseMult: 4 },
  { id: 'flush', label: 'Flush', baseChips: 35, baseMult: 4 },
  { id: 'full_house', label: 'Full House', baseChips: 40, baseMult: 4 },
  { id: 'four_of_a_kind', label: 'Four of a Kind', baseChips: 60, baseMult: 7 },
  { id: 'straight_flush', label: 'Straight Flush', baseChips: 100, baseMult: 8 },
]

const HAND_TYPE_MAP = new Map(HAND_TYPES.map((h) => [h.id, h]))

export function handTypeDef(id: HandTypeId): HandTypeDef {
  const def = HAND_TYPE_MAP.get(id)
  if (!def) throw new Error(`Unknown hand type: ${id}`)
  return def
}

export function handTypeRank(id: HandTypeId): number {
  return HAND_TYPES.findIndex((h) => h.id === id)
}
