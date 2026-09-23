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
  | 'five_of_a_kind'
  | 'flush_house'
  | 'flush_five'

export interface HandTypeDef {
  id: HandTypeId
  label: string
  baseChips: number
  baseMult: number
  /** Added to chips/mult for each level above 1 when a Planet effect levels this hand up */
  levelChips: number
  levelMult: number
}

/** Ordered weakest to strongest. Order also breaks ties when evaluating a played hand. */
export const HAND_TYPES: HandTypeDef[] = [
  { id: 'high_card', label: 'High Card', baseChips: 5, baseMult: 1, levelChips: 10, levelMult: 1 },
  { id: 'pair', label: 'Pair', baseChips: 10, baseMult: 2, levelChips: 15, levelMult: 1 },
  { id: 'two_pair', label: 'Two Pair', baseChips: 20, baseMult: 2, levelChips: 20, levelMult: 1 },
  {
    id: 'three_of_a_kind',
    label: 'Three of a Kind',
    baseChips: 30,
    baseMult: 3,
    levelChips: 20,
    levelMult: 2,
  },
  { id: 'straight', label: 'Straight', baseChips: 30, baseMult: 4, levelChips: 30, levelMult: 3 },
  { id: 'flush', label: 'Flush', baseChips: 35, baseMult: 4, levelChips: 15, levelMult: 2 },
  {
    id: 'full_house',
    label: 'Full House',
    baseChips: 40,
    baseMult: 4,
    levelChips: 25,
    levelMult: 2,
  },
  {
    id: 'four_of_a_kind',
    label: 'Four of a Kind',
    baseChips: 60,
    baseMult: 7,
    levelChips: 30,
    levelMult: 3,
  },
  {
    id: 'straight_flush',
    label: 'Straight Flush',
    baseChips: 100,
    baseMult: 8,
    levelChips: 40,
    levelMult: 4,
  },
  {
    id: 'five_of_a_kind',
    label: 'Five of a Kind',
    baseChips: 120,
    baseMult: 12,
    levelChips: 35,
    levelMult: 3,
  },
  {
    id: 'flush_house',
    label: 'Flush House',
    baseChips: 140,
    baseMult: 14,
    levelChips: 40,
    levelMult: 4,
  },
  {
    id: 'flush_five',
    label: 'Flush Five',
    baseChips: 160,
    baseMult: 16,
    levelChips: 50,
    levelMult: 3,
  },
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

/** Chips/mult for a hand type at a given level (level 1 = base values). */
export function handTypeAtLevel(id: HandTypeId, level: number): { chips: number; mult: number } {
  const def = handTypeDef(id)
  const bonusLevels = Math.max(0, level - 1)
  return {
    chips: def.baseChips + def.levelChips * bonusLevels,
    mult: def.baseMult + def.levelMult * bonusLevels,
  }
}

export function defaultHandLevels(): Record<HandTypeId, number> {
  return Object.fromEntries(HAND_TYPES.map((h) => [h.id, 1])) as Record<HandTypeId, number>
}
