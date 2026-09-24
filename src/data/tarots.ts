import type { Enhancement } from '../game/cards'

export type TarotId =
  | 'fool'
  | 'magician'
  | 'high_priestess'
  | 'empress'
  | 'emperor'
  | 'hierophant'
  | 'lovers'
  | 'chariot'
  | 'justice'
  | 'hermit'
  | 'wheel_of_fortune'
  | 'strength'
  | 'hanged_man'
  | 'death'
  | 'temperance'
  | 'devil'
  | 'tower'
  | 'star'
  | 'moon'
  | 'sun'
  | 'judgement'
  | 'world'

export interface TarotCardDef {
  id: TarotId
  name: string
  icon: string
  description: string
  /** cards the player must select from their hand before using this card (0 = none) */
  minTargets: number
  maxTargets: number
  /** set for the 8 cards that just enhance N selected cards to a given type */
  enhancement?: Enhancement
}

export const TAROT_CARDS: TarotCardDef[] = [
  {
    id: 'fool',
    name: 'The Fool',
    icon: '🎭',
    description: 'Creates a copy of the last Tarot or Planet card used this run (not counting The Fool itself).',
    minTargets: 0,
    maxTargets: 0,
  },
  {
    id: 'magician',
    name: 'The Magician',
    icon: '🎩',
    description: 'Enhances up to 2 selected cards into Lucky Cards.',
    minTargets: 1,
    maxTargets: 2,
    enhancement: 'lucky',
  },
  {
    id: 'high_priestess',
    name: 'The High Priestess',
    icon: '🌙',
    description: 'Creates up to 2 random Planet cards, applied instantly.',
    minTargets: 0,
    maxTargets: 0,
  },
  {
    id: 'empress',
    name: 'The Empress',
    icon: '👸',
    description: 'Enhances up to 2 selected cards into Mult Cards.',
    minTargets: 1,
    maxTargets: 2,
    enhancement: 'mult',
  },
  {
    id: 'emperor',
    name: 'The Emperor',
    icon: '🤴',
    description: 'Creates up to 2 random Tarot cards, if there is room in your consumable slots.',
    minTargets: 0,
    maxTargets: 0,
  },
  {
    id: 'hierophant',
    name: 'The Hierophant',
    icon: '📜',
    description: 'Enhances up to 2 selected cards into Bonus Cards.',
    minTargets: 1,
    maxTargets: 2,
    enhancement: 'bonus',
  },
  {
    id: 'lovers',
    name: 'The Lovers',
    icon: '💞',
    description: 'Enhances 1 selected card into a Wild Card.',
    minTargets: 1,
    maxTargets: 1,
    enhancement: 'wild',
  },
  {
    id: 'chariot',
    name: 'The Chariot',
    icon: '🏇',
    description: 'Enhances 1 selected card into a Steel Card.',
    minTargets: 1,
    maxTargets: 1,
    enhancement: 'steel',
  },
  {
    id: 'justice',
    name: 'Justice',
    icon: '⚔️',
    description: 'Enhances 1 selected card into a Glass Card.',
    minTargets: 1,
    maxTargets: 1,
    enhancement: 'glass',
  },
  {
    id: 'hermit',
    name: 'The Hermit',
    icon: '🕯️',
    description: 'Doubles your money, up to +$20.',
    minTargets: 0,
    maxTargets: 0,
  },
  {
    id: 'wheel_of_fortune',
    name: 'Wheel of Fortune',
    icon: '🎡',
    description: '1 in 4 chance to add a Foil, Holographic, or Polychrome edition to a random Cat.',
    minTargets: 0,
    maxTargets: 0,
  },
  {
    id: 'strength',
    name: 'Strength',
    icon: '💪',
    description: 'Increases the rank of up to 2 selected cards by 1 (Ace wraps to 2).',
    minTargets: 1,
    maxTargets: 2,
  },
  {
    id: 'hanged_man',
    name: 'The Hanged Man',
    icon: '🙃',
    description: 'Destroys up to 2 selected cards, permanently removing them from your deck.',
    minTargets: 1,
    maxTargets: 2,
  },
  {
    id: 'death',
    name: 'Death',
    icon: '💀',
    description: 'Select 2 cards — the left card becomes a copy of the right card.',
    minTargets: 2,
    maxTargets: 2,
  },
  {
    id: 'temperance',
    name: 'Temperance',
    icon: '⚖️',
    description: 'Gives the total sell value of all owned Cats, up to $50.',
    minTargets: 0,
    maxTargets: 0,
  },
  {
    id: 'devil',
    name: 'The Devil',
    icon: '😈',
    description: 'Enhances 1 selected card into a Gold Card.',
    minTargets: 1,
    maxTargets: 1,
    enhancement: 'gold',
  },
  {
    id: 'tower',
    name: 'The Tower',
    icon: '🗼',
    description: 'Enhances 1 selected card into a Stone Card.',
    minTargets: 1,
    maxTargets: 1,
    enhancement: 'stone',
  },
  {
    id: 'star',
    name: 'The Star',
    icon: '⭐',
    description: 'Converts up to 3 selected cards to ♦ Diamonds.',
    minTargets: 1,
    maxTargets: 3,
  },
  {
    id: 'moon',
    name: 'The Moon',
    icon: '🌕',
    description: 'Converts up to 3 selected cards to ♣ Clubs.',
    minTargets: 1,
    maxTargets: 3,
  },
  {
    id: 'sun',
    name: 'The Sun',
    icon: '☀️',
    description: 'Converts up to 3 selected cards to ♥ Hearts.',
    minTargets: 1,
    maxTargets: 3,
  },
  {
    id: 'judgement',
    name: 'Judgement',
    icon: '⚡',
    description: 'Creates a random Cat, if there is room in your Cat slots.',
    minTargets: 0,
    maxTargets: 0,
  },
  {
    id: 'world',
    name: 'The World',
    icon: '🌍',
    description: 'Converts up to 3 selected cards to ♠ Spades.',
    minTargets: 1,
    maxTargets: 3,
  },
]

const TAROT_MAP = new Map(TAROT_CARDS.map((t) => [t.id, t]))

export function tarotCard(id: string): TarotCardDef {
  const def = TAROT_MAP.get(id as TarotId)
  if (!def) throw new Error(`Unknown tarot card: ${id}`)
  return def
}
