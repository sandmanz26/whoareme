/** One day's counters. Days are ISO `YYYY-MM-DD` in the viewer's timezone. */
export interface TrafficDay {
  profile: number
  work: Record<string, number>
}

export interface TrafficStore {
  days: Record<string, TrafficDay>
}

export const EMPTY_TRAFFIC: TrafficStore = { days: {} }

export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`
}

export function lastDays(count: number, today = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (count - 1 - index))
    return isoDay(date)
  })
}

function bumpDay(store: TrafficStore, day: string): TrafficDay {
  const existing = store.days[day]
  return existing ?? { profile: 0, work: {} }
}

export function recordProfileView(store: TrafficStore, day: string): TrafficStore {
  const current = bumpDay(store, day)
  return { days: { ...store.days, [day]: { ...current, profile: current.profile + 1 } } }
}

export function recordWorkOpen(store: TrafficStore, day: string, workId: string): TrafficStore {
  const current = bumpDay(store, day)
  return {
    days: {
      ...store.days,
      [day]: { ...current, work: { ...current.work, [workId]: (current.work[workId] ?? 0) + 1 } },
    },
  }
}

export interface TrafficSeries {
  days: string[]
  profile: number[]
  work: number[]
}

export function seriesFor(store: TrafficStore, days: string[]): TrafficSeries {
  return {
    days,
    profile: days.map((day) => store.days[day]?.profile ?? 0),
    work: days.map((day) =>
      Object.values(store.days[day]?.work ?? {}).reduce((sum, n) => sum + n, 0),
    ),
  }
}

export function totalProfileViews(store: TrafficStore): number {
  return Object.values(store.days).reduce((sum, day) => sum + day.profile, 0)
}

export function opensByWork(store: TrafficStore): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const day of Object.values(store.days)) {
    for (const [id, count] of Object.entries(day.work)) {
      totals[id] = (totals[id] ?? 0) + count
    }
  }
  return totals
}

export function totalWorkOpens(store: TrafficStore): number {
  return Object.values(opensByWork(store)).reduce((sum, n) => sum + n, 0)
}

/** Sum over the most recent `count` days, for the trend comparison. */
export function windowTotal(series: number[], count: number): number {
  return series.slice(-count).reduce((sum, n) => sum + n, 0)
}
