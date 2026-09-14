/** Tiny class-name joiner. Keeps JSX readable without pulling in a dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}

/** Deterministic pick from a list - the same seed always yields the same item. */
export function pickBy<T>(items: readonly T[], seed: string): T {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return items[hash % items.length]
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
}

/** "1 person" / "4 people" - small thing, but wrong plurals read as broken. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
