import type { Card as CardModel } from '../game/cards'
import { isRedSuit, rankLabel, suitSymbol } from '../game/cards'

interface CardProps {
  card: CardModel
  selected?: boolean
  onClick?: () => void
  small?: boolean
}

export function Card({ card, selected, onClick, small }: CardProps) {
  const red = isRedSuit(card.suit)
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        small ? 'w-12 h-16 text-sm' : 'w-16 h-24 text-lg',
        'flex flex-col items-center justify-center rounded-lg border-2 bg-white font-bold shadow-md transition-transform select-none',
        red ? 'text-red-600' : 'text-zinc-900',
        selected ? '-translate-y-3 border-yellow-400 ring-2 ring-yellow-300' : 'border-zinc-300',
        onClick ? 'cursor-pointer hover:-translate-y-1' : '',
      ].join(' ')}
    >
      <span>{rankLabel(card.rank)}</span>
      <span>{suitSymbol(card.suit)}</span>
    </button>
  )
}
