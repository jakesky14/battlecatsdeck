export const MAX_CONSUMABLE_SLOTS = 2

export function effectiveMaxConsumableSlots(bonusConsumableSlots: number): number {
  return MAX_CONSUMABLE_SLOTS + bonusConsumableSlots
}

export interface ConsumableItem {
  instanceId: string
  /** 'planet' only occurs from a Blue Seal — packs/High Priestess/Fool-copied
   *  Planets always auto-apply instantly and never sit in a slot. */
  kind: 'tarot' | 'planet' | 'spectral'
  cardId: string
}
