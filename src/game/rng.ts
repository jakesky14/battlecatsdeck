export function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}
