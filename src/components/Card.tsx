import type { Card as CardModel } from '../game/cards'
import { isRedSuit, rankLabel, suitSymbol } from '../game/cards'
import { EDITION_LABELS, ENHANCEMENT_LABELS, SEAL_LABELS } from '../game/cardMods'

const ENHANCEMENT_ICONS: Record<string, string> = {
  bonus: '➕',
  mult: '✖️',
  wild: '🌈',
  glass: '🔷',
  steel: '⚙️',
  stone: '🪨',
  gold: '🪙',
  lucky: '🍀',
}

const EDITION_BORDER: Record<string, string> = {
  foil: '#67e8f9',
  holographic: '#c084fc',
  polychrome: '#f472b6',
}

const SEAL_COLORS: Record<string, string> = {
  gold: '#eab308',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
}

interface CardProps {
  card: CardModel
  selected?: boolean
  onClick?: () => void
  small?: boolean
}

export function Card({ card, selected, onClick, small }: CardProps) {
  const red = isRedSuit(card.suit)
  const editionColor = card.edition ? EDITION_BORDER[card.edition] : undefined

  const title =
    [
      card.enhancement ? ENHANCEMENT_LABELS[card.enhancement] : null,
      card.edition ? EDITION_LABELS[card.edition] : null,
      ...(card.seals ?? []).map((seal) => SEAL_LABELS[seal]),
    ]
      .filter(Boolean)
      .join(' · ') || undefined

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={editionColor && !selected ? { borderColor: editionColor, boxShadow: `0 0 6px ${editionColor}` } : undefined}
      className={[
        small ? 'w-12 h-16 text-sm' : 'w-16 h-24 text-lg',
        'relative flex flex-col items-center justify-center rounded-lg border-2 bg-white font-bold shadow-md transition-transform select-none',
        red ? 'text-red-600' : 'text-zinc-900',
        selected ? '-translate-y-3 border-yellow-400 ring-2 ring-yellow-300' : editionColor ? '' : 'border-zinc-300',
        onClick ? 'cursor-pointer hover:-translate-y-1' : '',
      ].join(' ')}
    >
      <span>{rankLabel(card.rank)}</span>
      <span>{suitSymbol(card.suit)}</span>
      {card.enhancement && (
        <span className="absolute bottom-0.5 right-0.5 text-[10px] leading-none">
          {ENHANCEMENT_ICONS[card.enhancement]}
        </span>
      )}
      {card.seals && card.seals.length > 0 && (
        <span className="absolute left-0.5 top-0.5 flex gap-0.5">
          {card.seals.map((seal) => (
            <span key={seal} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SEAL_COLORS[seal] }} />
          ))}
        </span>
      )}
    </button>
  )
}
