import type { CatDef } from './types'

const PAIR_LIKE = new Set(['pair', 'two_pair', 'three_of_a_kind', 'full_house', 'four_of_a_kind'])

export const CAT_ROSTER: CatDef[] = [
  // -- Common --
  {
    id: 'cat',
    name: 'Cat',
    rarity: 'common',
    cost: 3,
    sellValue: 1,
    icon: '🐱',
    description: '+$1 whenever you win a round.',
    effects: {
      onRoundEnd: (ctx) => (ctx.won ? 1 : 0),
    },
  },
  {
    id: 'tank_cat',
    name: 'Tank Cat',
    rarity: 'common',
    cost: 4,
    sellValue: 2,
    icon: '🛡️',
    description: '+20 Chips if the played hand contains a pair or better.',
    effects: {
      onHandPlayed: (state, ctx) => {
        if (PAIR_LIKE.has(ctx.handType)) state.chips += 20
      },
    },
  },
  {
    id: 'axe_cat',
    name: 'Axe Cat',
    rarity: 'common',
    cost: 5,
    sellValue: 2,
    icon: '🪓',
    description: '+4 Mult if the played hand is a Flush.',
    effects: {
      onHandPlayed: (state, ctx) => {
        if (ctx.handType === 'flush' || ctx.handType === 'straight_flush') state.mult += 4
      },
    },
  },
  {
    id: 'bird_cat',
    name: 'Bird Cat',
    rarity: 'common',
    cost: 4,
    sellValue: 2,
    icon: '🐦',
    description: '+3 Chips for each ♠ Spade that scores.',
    effects: {
      onCardScored: (state, ctx) => {
        if (ctx.card.suit === 'spades') state.chips += 3
      },
    },
  },
  {
    id: 'gross_cat',
    name: 'Gross Cat',
    rarity: 'common',
    cost: 4,
    sellValue: 2,
    icon: '🤢',
    description: '+15 Chips and +1 Mult if the played hand is just a High Card.',
    effects: {
      onHandPlayed: (state, ctx) => {
        if (ctx.handType === 'high_card') {
          state.chips += 15
          state.mult += 1
        }
      },
    },
  },
  // -- Uncommon (Special) --
  {
    id: 'cow_cat',
    name: 'Cow Cat',
    rarity: 'uncommon',
    cost: 6,
    sellValue: 3,
    icon: '🐮',
    description: '+2 Mult for each discard used this round.',
    effects: {
      onHandPlayed: (state, ctx) => {
        state.mult += ctx.discardsUsedThisRound * 2
      },
    },
  },
  {
    id: 'crazed_cat',
    name: 'Crazed Cat',
    rarity: 'uncommon',
    cost: 7,
    sellValue: 3,
    icon: '😾',
    description: '+8 Mult for each Ace that scores.',
    effects: {
      onCardScored: (state, ctx) => {
        if (ctx.card.rank === 14) state.mult += 8
      },
    },
  },
  {
    id: 'island_cat',
    name: 'Island Cat',
    rarity: 'uncommon',
    cost: 7,
    sellValue: 3,
    icon: '🏝️',
    description: '+30 Chips and +2 Mult if the played hand is a Straight.',
    effects: {
      onHandPlayed: (state, ctx) => {
        if (ctx.handType === 'straight' || ctx.handType === 'straight_flush') {
          state.chips += 30
          state.mult += 2
        }
      },
    },
  },
  {
    id: 'titan_cat',
    name: 'Titan Cat',
    rarity: 'uncommon',
    cost: 8,
    sellValue: 4,
    icon: '🗿',
    description: 'x1.5 Mult if the played hand is a Four of a Kind.',
    effects: {
      onHandPlayed: (state, ctx) => {
        if (ctx.handType === 'four_of_a_kind') state.mult *= 1.5
      },
    },
  },
  {
    id: 'jamiera_cat',
    name: 'Jamiera Cat',
    rarity: 'uncommon',
    cost: 6,
    sellValue: 3,
    icon: '🥊',
    description: '+2 Mult for each ♥ Heart that scores.',
    effects: {
      onCardScored: (state, ctx) => {
        if (ctx.card.suit === 'hearts') state.mult += 2
      },
    },
  },
  // -- Rare --
  {
    id: 'dragon_cat',
    name: 'Dragon Cat',
    rarity: 'rare',
    cost: 9,
    sellValue: 4,
    icon: '🐉',
    description: '+5 Chips for each hand already played this round.',
    effects: {
      onHandPlayed: (state, ctx) => {
        state.chips += ctx.handsPlayedThisRound * 5
      },
    },
  },
  {
    id: 'king_dragon_cat',
    name: 'King Dragon Cat',
    rarity: 'rare',
    cost: 10,
    sellValue: 5,
    icon: '👑',
    description: '+40 Chips and +6 Mult if the played hand is a Full House.',
    effects: {
      onHandPlayed: (state, ctx) => {
        if (ctx.handType === 'full_house') {
          state.chips += 40
          state.mult += 6
        }
      },
    },
  },
  // -- Uber Rare --
  {
    id: 'cyberpunk_cat',
    name: 'Cyberpunk Cat',
    rarity: 'uber',
    cost: 11,
    sellValue: 5,
    icon: '🤖',
    description: '+1 Mult for every card that scores.',
    effects: {
      onCardScored: (state) => {
        state.mult += 1
      },
    },
  },
  {
    id: 'awakened_bahamut_cat',
    name: 'Awakened Bahamut Cat',
    rarity: 'uber',
    cost: 12,
    sellValue: 6,
    icon: '🐲',
    description: '+5 Chips always; x3 Mult if the played hand is a Straight Flush.',
    effects: {
      onHandPlayed: (state, ctx) => {
        state.chips += 5
        if (ctx.handType === 'straight_flush') state.mult *= 3
      },
    },
  },
]

const CAT_MAP = new Map(CAT_ROSTER.map((c) => [c.id, c]))

export function catDef(id: string): CatDef {
  const def = CAT_MAP.get(id)
  if (!def) throw new Error(`Unknown cat: ${id}`)
  return def
}
