import { isoDay, type TrafficStore } from "./traffic"

/**
 * A plausible 30-day history so the traffic view has something to show on day
 * one. It is deterministic from the account id - reloading does not reshuffle
 * the numbers - and the panel states plainly that history is simulated while
 * opens in this browser are counted for real on top of it.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function seedTraffic(accountId: string, days = 30, today = new Date()): TrafficStore {
  const random = mulberry32(hash(accountId))
  const store: TrafficStore = { days: {} }

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)

    // Weekends are quieter - recruiters browse on work days.
    const weekday = date.getDay()
    const weekend = weekday === 0 || weekday === 6
    const base = weekend ? 2 : 7
    const profile = Math.max(0, Math.round(base + random() * (weekend ? 4 : 12)))

    store.days[isoDay(date)] = { profile, work: {} }
  }

  return store
}
