import type { Card, Rank } from './cards'
import type { HandTypeId } from '../data/handTypes'

export interface EvaluatedHand {
  handType: HandTypeId
  /** The subset of played cards that actually score (e.g. just the pair, not kickers) */
  scoringCards: Card[]
}

interface RankGroup {
  rank: Rank
  cards: Card[]
  count: number
}

function groupByRank(cards: Card[]): RankGroup[] {
  const map = new Map<Rank, Card[]>()
  for (const card of cards) {
    const bucket = map.get(card.rank)
    if (bucket) bucket.push(card)
    else map.set(card.rank, [card])
  }
  return Array.from(map.entries())
    .map(([rank, groupCards]) => ({ rank, cards: groupCards, count: groupCards.length }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank)
}

function isFlush(cards: Card[]): boolean {
  return cards.length === 5 && new Set(cards.map((c) => c.suit)).size === 1
}

function isStraight(cards: Card[]): boolean {
  if (cards.length !== 5) return false
  const uniqueRanks = Array.from(new Set(cards.map((c) => c.rank))).sort((a, b) => a - b)
  if (uniqueRanks.length !== 5) return false
  const [a, , , , e] = uniqueRanks
  if (e - a === 4) return true
  // ace-low straight: A,2,3,4,5
  return uniqueRanks.join(',') === '2,3,4,5,14'
}

function highestCard(cards: Card[]): Card {
  return [...cards].sort((a, b) => b.rank - a.rank)[0]
}

/**
 * Evaluates a played hand of 1-5 cards and returns the best matching poker
 * hand type plus which cards actually contribute to scoring.
 */
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length === 0) {
    return { handType: 'high_card', scoringCards: [] }
  }

  const groups = groupByRank(cards)
  const flush = isFlush(cards)
  const straight = isStraight(cards)

  // These require duplicate ranks/suits beyond what a standard 52-card deck
  // can deal on its own — reachable once cards can be duplicated/enhanced.
  if (flush && groups[0].count === 5) {
    return { handType: 'flush_five', scoringCards: cards }
  }
  if (flush && groups[0].count === 3 && groups[1]?.count === 2) {
    return { handType: 'flush_house', scoringCards: cards }
  }
  if (groups[0].count === 5) {
    return { handType: 'five_of_a_kind', scoringCards: cards }
  }
  if (flush && straight) {
    return { handType: 'straight_flush', scoringCards: cards }
  }
  if (groups[0].count === 4) {
    return { handType: 'four_of_a_kind', scoringCards: groups[0].cards }
  }
  if (groups[0].count === 3 && groups[1]?.count === 2) {
    return { handType: 'full_house', scoringCards: cards }
  }
  if (flush) {
    return { handType: 'flush', scoringCards: cards }
  }
  if (straight) {
    return { handType: 'straight', scoringCards: cards }
  }
  if (groups[0].count === 3) {
    return { handType: 'three_of_a_kind', scoringCards: groups[0].cards }
  }
  if (groups[0].count === 2 && groups[1]?.count === 2) {
    return { handType: 'two_pair', scoringCards: [...groups[0].cards, ...groups[1].cards] }
  }
  if (groups[0].count === 2) {
    return { handType: 'pair', scoringCards: groups[0].cards }
  }
  return { handType: 'high_card', scoringCards: [highestCard(cards)] }
}
