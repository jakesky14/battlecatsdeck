export const MAX_CONSUMABLE_SLOTS = 2

export interface ConsumableItem {
  instanceId: string
  /** 'spectral' will be added once the real Spectral card list is implemented */
  kind: 'tarot'
  cardId: string
}
