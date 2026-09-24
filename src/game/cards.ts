export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'

/** 2-10 are numeric, 11=Jack, 12=Queen, 13=King, 14=Ace */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export type Enhancement = 'bonus' | 'mult' | 'wild' | 'glass' | 'steel' | 'stone' | 'gold' | 'lucky'
export type Seal = 'gold' | 'red' | 'blue' | 'purple'
/** Playing cards can't be Negative — that's Cat/consumable-only. */
export type CardEdition = 'foil' | 'holographic' | 'polychrome'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  /** at most one at a time; permanent for the run unless replaced */
  enhancement?: Enhancement
  /** at most 2, order doesn't matter; permanent for the run unless replaced/removed */
  seals?: Seal[]
  edition?: CardEdition
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

const RANK_LABELS: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

export function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank]
}

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit]
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

/** Chip value scored per card: number cards = rank, face cards = 10, ace = 11 */
export function cardChipValue(rank: Rank): number {
  if (rank === 14) return 11
  if (rank >= 11) return 10
  return rank
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank })
    }
  }
  return deck
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
