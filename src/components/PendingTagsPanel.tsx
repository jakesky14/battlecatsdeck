import { EDITION_LABELS } from '../game/cardMods'
import type { RunState } from '../game/runState'

function pendingBadges(run: RunState): string[] {
  const badges: string[] = []
  if (run.pendingUncommonJoker) badges.push('🟢 Free Special Cat in your next shop')
  if (run.pendingRareJoker) badges.push('🔵 Free Rare Cat in your next shop')
  if (run.pendingFreeEdition) {
    badges.push(`✨ Your next base-edition shop Joker is free & ${EDITION_LABELS[run.pendingFreeEdition]}`)
  }
  if (run.pendingVoucherTag) badges.push('📜 A Voucher is guaranteed in your next shop')
  if (run.pendingFreeShop) badges.push('🎟️ Your next shop starter items are free')
  if (run.pendingCheapReroll) badges.push('🎲 Rerolls start at $0 in your next shop')
  if (run.pendingDoubleTag) badges.push('👥 Your next Tag will be doubled')
  if (run.pendingInvestmentPayouts > 0) {
    badges.push(`💰 +$${run.pendingInvestmentPayouts * 25} when you defeat this Ante's Boss Blind`)
  }
  if (run.juggleBonusNextRound > 0) badges.push(`🤹 +${run.juggleBonusNextRound} hand size next round`)
  return badges
}

/** Shows any Tag effects that are still pending (waiting on a future shop,
 *  round, or Boss Blind kill) so they aren't invisible to the player. */
export function PendingTagsPanel({ run }: { run: RunState }) {
  const badges = pendingBadges(run)
  if (badges.length === 0) return null

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-indigo-800 bg-indigo-950/40 px-3 py-2 text-xs text-indigo-300">
      {badges.map((b) => (
        <div key={b}>{b}</div>
      ))}
    </div>
  )
}
