export type TagId =
  // Available at any Ante
  | 'uncommon'
  | 'investment'
  | 'voucher'
  | 'boss'
  | 'charm'
  | 'coupon'
  | 'double'
  | 'juggle'
  | 'd6'
  | 'speed'
  | 'economy'
  // Ante 2+
  | 'standard'
  | 'meteor'
  | 'buffoon'
  | 'handy'
  | 'garbage'
  | 'ethereal'
  | 'top_up'
  | 'orbital'
  // Unlock-gated (see game/tags.ts for the unlock checks)
  | 'rare'
  | 'foil'
  | 'holographic'
  | 'polychrome'
  | 'negative'

export interface TagDef {
  id: TagId
  name: string
  icon: string
  description: string
  /** 1 = any Ante, 2 = Ante 2+ */
  minAnte: number
}

export const TAGS: TagDef[] = [
  {
    id: 'uncommon',
    name: 'Uncommon Tag',
    icon: '🟢',
    description: 'Your next shop has a free Special Cat in one of its single card slots.',
    minAnte: 1,
  },
  {
    id: 'investment',
    name: 'Investment Tag',
    icon: '💰',
    description: "Gain $25 after defeating this Ante's Boss Blind.",
    minAnte: 1,
  },
  {
    id: 'voucher',
    name: 'Voucher Tag',
    icon: '📜',
    description: 'Adds a Voucher to your next shop.',
    minAnte: 1,
  },
  {
    id: 'boss',
    name: 'Boss Tag',
    icon: '👹',
    description: "Rerolls this Ante's Boss Blind.",
    minAnte: 1,
  },
  {
    id: 'charm',
    name: 'Charm Tag',
    icon: '🔮',
    description: 'Gives a free Mega Arcana Pack, opened instantly.',
    minAnte: 1,
  },
  {
    id: 'coupon',
    name: 'Coupon Tag',
    icon: '🎟️',
    description: 'The initial cards and packs in your next shop are free.',
    minAnte: 1,
  },
  {
    id: 'double',
    name: 'Double Tag',
    icon: '👥',
    description: 'Gives a copy of the next Tag you get (Double Tag excluded).',
    minAnte: 1,
  },
  {
    id: 'juggle',
    name: 'Juggle Tag',
    icon: '🤹',
    description: '+3 hand size next round.',
    minAnte: 1,
  },
  {
    id: 'd6',
    name: 'D6 Tag',
    icon: '🎲',
    description: 'Rerolls in your next shop start at $0.',
    minAnte: 1,
  },
  {
    id: 'speed',
    name: 'Speed Tag',
    icon: '💨',
    description: 'Gives $5, plus $5 for every Blind skipped so far this run.',
    minAnte: 1,
  },
  {
    id: 'economy',
    name: 'Economy Tag',
    icon: '📈',
    description: 'Doubles your money, up to +$40.',
    minAnte: 1,
  },
  {
    id: 'standard',
    name: 'Standard Tag',
    icon: '🃏',
    description: 'Gives a free Mega Standard Pack, opened instantly.',
    minAnte: 2,
  },
  {
    id: 'meteor',
    name: 'Meteor Tag',
    icon: '☄️',
    description: 'Gives a free Mega Celestial Pack, opened instantly.',
    minAnte: 2,
  },
  {
    id: 'buffoon',
    name: 'Buffoon Tag',
    icon: '🎪',
    description: 'Gives a free Mega Buffoon Pack, opened instantly.',
    minAnte: 2,
  },
  {
    id: 'handy',
    name: 'Handy Tag',
    icon: '🖐️',
    description: 'Gives $1 for every hand played this run.',
    minAnte: 2,
  },
  {
    id: 'garbage',
    name: 'Garbage Tag',
    icon: '🗑️',
    description: 'Gives $1 for every unused discard this run.',
    minAnte: 2,
  },
  {
    id: 'ethereal',
    name: 'Ethereal Tag',
    icon: '👻',
    description: 'Gives a free Spectral Pack, opened instantly.',
    minAnte: 2,
  },
  {
    id: 'top_up',
    name: 'Top Up Tag',
    icon: '🔝',
    description: 'Creates up to 2 Normal Cats, as long as there is room.',
    minAnte: 2,
  },
  {
    id: 'orbital',
    name: 'Orbital Tag',
    icon: '🛸',
    description: 'Upgrades a random poker hand 3 times.',
    minAnte: 2,
  },
  {
    id: 'rare',
    name: 'Rare Tag',
    icon: '🔵',
    description:
      'Your next shop has a free Rare Cat. Unlocks by discovering the Blueprint Joker (not yet implemented).',
    minAnte: 1,
  },
  {
    id: 'foil',
    name: 'Foil Tag',
    icon: '⬜',
    description:
      'Your next base-edition shop Joker is free and becomes Foil. Unlocks by obtaining a Foil card in any run.',
    minAnte: 1,
  },
  {
    id: 'holographic',
    name: 'Holographic Tag',
    icon: '🟪',
    description:
      'Your next base-edition shop Joker is free and becomes Holographic. Unlocks by obtaining a Holographic card in any run.',
    minAnte: 1,
  },
  {
    id: 'polychrome',
    name: 'Polychrome Tag',
    icon: '🌈',
    description:
      'Your next base-edition shop Joker is free and becomes Polychrome. Unlocks by obtaining a Polychrome card in any run.',
    minAnte: 1,
  },
  {
    id: 'negative',
    name: 'Negative Tag',
    icon: '⬛',
    description:
      'Your next base-edition shop Joker is free and becomes Negative. Unlocks by obtaining a Negative card in any run.',
    minAnte: 2,
  },
]

const TAG_MAP = new Map(TAGS.map((t) => [t.id, t]))

export function tagDef(id: TagId): TagDef {
  const def = TAG_MAP.get(id)
  if (!def) throw new Error(`Unknown tag: ${id}`)
  return def
}
