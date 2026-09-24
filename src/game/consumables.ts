export const MAX_CONSUMABLE_SLOTS = 2

export interface ConsumableItem {
  instanceId: string
  /** 'spectral' will be added once the real Spectral card list is implemented.
   *  'planet' only occurs from a Blue Seal — packs/High Priestess/Fool-copied
   *  Planets always auto-apply instantly and never sit in a slot. */
  kind: 'tarot' | 'planet'
  cardId: string
}
