/**
 * The Fool, High Priestess, Emperor, Hermit, Strength, Hanged Man, Death,
 * Temperance, Star, Moon, Sun, Judgement, World — the 13 Tarot cards that
 * don't depend on the card-enhancement/edition systems.
 *
 * Magician, Empress, Hierophant, Lovers, Chariot, Justice, Wheel of
 * Fortune, Devil, and Tower are intentionally left out of this list until
 * enhancements/editions are implemented, so they never appear in a pack.
 */
export type TarotId =
  | 'fool'
  | 'high_priestess'
  | 'emperor'
  | 'hermit'
  | 'strength'
  | 'hanged_man'
  | 'death'
  | 'temperance'
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
    id: 'high_priestess',
    name: 'The High Priestess',
    icon: '🌙',
    description: 'Creates up to 2 random Planet cards, applied instantly.',
    minTargets: 0,
    maxTargets: 0,
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
    id: 'hermit',
    name: 'The Hermit',
    icon: '🕯️',
    description: 'Doubles your money, up to +$20.',
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
