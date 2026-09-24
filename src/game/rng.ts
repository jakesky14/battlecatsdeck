export function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

export function pickWeighted<T extends string>(weights: Record<T, number>, rng: () => number): T {
  const entries = Object.entries(weights) as [T, number][]
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total
  for (const [key, weight] of entries) {
    if (roll < weight) return key
    roll -= weight
  }
  return entries[0][0]
}

/** Rolls true with the given probability (0-1). */
export function chance(probability: number, rng: () => number): boolean {
  return rng() < probability
}
