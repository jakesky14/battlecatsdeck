export type SpectralId =
  | 'familiar'
  | 'grim'
  | 'incantation'
  | 'talisman'
  | 'aura'
  | 'wraith'
  | 'sigil'
  | 'ouija'
  | 'ectoplasm'
  | 'immolate'
  | 'ankh'
  | 'deja_vu'
  | 'hex'
  | 'trance'
  | 'medium'
  | 'cryptid'
  | 'soul'
  | 'black_hole'

export interface SpectralCardDef {
  id: SpectralId
  name: string
  icon: string
  description: string
  /** cards the player must select from their hand before using this card (0 = none) */
  minTargets: number
  maxTargets: number
  /** true if this card acts on the player's current hand of cards as a whole
   *  (destroying/converting/adding to it) and so only makes sense mid-round */
  requiresHand: boolean
}

export const SPECTRAL_CARDS: SpectralCardDef[] = [
  {
    id: 'familiar',
    name: 'Familiar',
    icon: '🐈‍⬛',
    description: 'Destroys 1 random card in hand, adds 3 random Enhanced face cards to your hand.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: true,
  },
  {
    id: 'grim',
    name: 'Grim',
    icon: '💀',
    description: 'Destroys 1 random card in hand, adds 2 random Enhanced Aces to your hand.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: true,
  },
  {
    id: 'incantation',
    name: 'Incantation',
    icon: '🕯️',
    description: 'Destroys 1 random card in hand, adds 4 random Enhanced numbered cards to your hand.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: true,
  },
  {
    id: 'talisman',
    name: 'Talisman',
    icon: '🔯',
    description: 'Adds a Gold Seal to 1 selected card in your hand.',
    minTargets: 1,
    maxTargets: 1,
    requiresHand: true,
  },
  {
    id: 'aura',
    name: 'Aura',
    icon: '🌈',
    description: 'Adds Foil, Holographic, or Polychrome to 1 selected card in your hand.',
    minTargets: 1,
    maxTargets: 1,
    requiresHand: true,
  },
  {
    id: 'wraith',
    name: 'Wraith',
    icon: '👻',
    description: 'Creates a random Rare Cat, sets money to $0.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: false,
  },
  {
    id: 'sigil',
    name: 'Sigil',
    icon: '🔻',
    description: 'Converts all cards in your hand to a single random suit.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: true,
  },
  {
    id: 'ouija',
    name: 'Ouija',
    icon: '👁️',
    description: 'Converts all cards in your hand to a single random rank. -1 hand size, permanently.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: true,
  },
  {
    id: 'ectoplasm',
    name: 'Ectoplasm',
    icon: '🧪',
    description: 'Adds Negative to a random Cat. -1 hand size, permanently.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: false,
  },
  {
    id: 'immolate',
    name: 'Immolate',
    icon: '🔥',
    description: 'Destroys 5 random cards in hand, gain $20.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: true,
  },
  {
    id: 'ankh',
    name: 'Ankh',
    icon: '☥',
    description: 'Creates a copy of a random Cat, destroys all other Cats.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: false,
  },
  {
    id: 'deja_vu',
    name: 'Deja Vu',
    icon: '🔁',
    description: 'Adds a Red Seal to 1 selected card in your hand.',
    minTargets: 1,
    maxTargets: 1,
    requiresHand: true,
  },
  {
    id: 'hex',
    name: 'Hex',
    icon: '✳️',
    description: 'Adds Polychrome to a random Cat, destroys all other Cats.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: false,
  },
  {
    id: 'trance',
    name: 'Trance',
    icon: '🌀',
    description: 'Adds a Blue Seal to 1 selected card in your hand.',
    minTargets: 1,
    maxTargets: 1,
    requiresHand: true,
  },
  {
    id: 'medium',
    name: 'Medium',
    icon: '🔮',
    description: 'Adds a Purple Seal to 1 selected card in your hand.',
    minTargets: 1,
    maxTargets: 1,
    requiresHand: true,
  },
  {
    id: 'cryptid',
    name: 'Cryptid',
    icon: '🐾',
    description: 'Creates 2 copies of 1 selected card in your hand.',
    minTargets: 1,
    maxTargets: 1,
    requiresHand: true,
  },
  {
    id: 'soul',
    name: 'The Soul',
    icon: '✨',
    description: 'Creates a Legendary Cat, as long as there is room.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: false,
  },
  {
    id: 'black_hole',
    name: 'Black Hole',
    icon: '🕳️',
    description: 'Upgrades every poker hand by 1 level.',
    minTargets: 0,
    maxTargets: 0,
    requiresHand: false,
  },
]

const SPECTRAL_MAP = new Map(SPECTRAL_CARDS.map((s) => [s.id, s]))

export function spectralCard(id: string): SpectralCardDef {
  const def = SPECTRAL_MAP.get(id as SpectralId)
  if (!def) throw new Error(`Unknown spectral card: ${id}`)
  return def
}
