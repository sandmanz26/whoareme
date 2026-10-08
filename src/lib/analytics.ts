import { readJson, writeJson } from "@/lib/storage"

/**
 * Funnel counters, first-party and cookieless.
 *
 * `docs/BUSINESS.md` names the metric that decides whether this product works:
 * **completion rate of a first entry.** The forms are demanding on purpose,
 * and too demanding kills supply. Shipping without measuring that means
 * shipping without being able to tell whether the central bet is wrong.
 *
 * What this is not: no cookies, no third-party script, no per-person
 * identifier, no page-view log, no path or referrer. It counts how many times
 * each named step happened, and nothing about who did it. Two people who
 * publish an entry are indistinguishable in this data, which is the point -
 * the question is "do people finish", not "did this person finish".
 *
 * Counters are accumulated in `localStorage` and flushed to the server in
 * batches, so the aggregate spans everyone rather than one browser. The flush
 * subtracts exactly what it sent, so an event that lands mid-request is neither
 * lost nor counted twice. Deliberately counters rather than an event stream,
 * because a stream of timestamped events is a behavioural record, and this does
 * not need one to answer the question.
 */

const KEY = "funnel"
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000"
const FUNNEL_URL = `${API_BASE}/api/v1/moderation/analytics/funnel`

export const FUNNEL_STEPS = [
  { id: "signup_opened", label: "Opened sign up", stage: "supply" },
  { id: "signup_step_2", label: "Reached step 2", stage: "supply" },
  { id: "signup_step_3", label: "Reached step 3", stage: "supply" },
  { id: "signup_completed", label: "Created a profile", stage: "supply" },

  { id: "entry_opened", label: "Opened the entry form", stage: "entry" },
  { id: "entry_template_chosen", label: "Chose a template", stage: "entry" },
  { id: "entry_saved_draft", label: "Saved a draft", stage: "entry" },
  { id: "entry_publish_blocked", label: "Publish blocked by validation", stage: "entry" },
  { id: "entry_published", label: "Published an entry", stage: "entry" },

  { id: "search_used", label: "Used search", stage: "demand" },
  { id: "filter_used", label: "Used a filter", stage: "demand" },
  { id: "case_study_opened", label: "Opened a case study", stage: "demand" },
  { id: "profile_opened", label: "Opened a profile", stage: "demand" },
] as const

export type FunnelStep = (typeof FUNNEL_STEPS)[number]["id"]
export type FunnelStage = (typeof FUNNEL_STEPS)[number]["stage"]

export type FunnelCounts = Partial<Record<FunnelStep, number>>

export function readFunnel(): FunnelCounts {
  return readJson<FunnelCounts>(KEY, {})
}

const FLUSH_DELAY_MS = 5000
let flushTimer: number | null = null

function scheduleFlush(): void {
  if (typeof window === "undefined" || flushTimer !== null) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flushFunnel()
  }, FLUSH_DELAY_MS)
}

/**
 * Send the counters accumulated in this browser to the server, then subtract
 * exactly what was sent. On any failure the local counters stay put and the
 * next flush retries. Fire-and-forget: an analytics write must never slow down
 * or fail the thing the person was actually doing.
 */
export async function flushFunnel(): Promise<void> {
  const local = readFunnel()
  const known = new Set<string>(FUNNEL_STEPS.map((step) => step.id))

  // Only known steps go out: the server schema is strict, so a leftover key from
  // a step that was since removed would otherwise fail every flush forever.
  const sent: FunnelCounts = {}
  for (const [step, count] of Object.entries(local) as [FunnelStep, number][]) {
    if (known.has(step) && count > 0) sent[step] = count
  }

  if (Object.keys(sent).length === 0) {
    if (Object.keys(local).length > 0) writeJson(KEY, {})
    return
  }

  try {
    const res = await fetch(FUNNEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counts: sent }),
      keepalive: true,
    })
    if (!res.ok) return

    const current = readFunnel()
    const remaining: FunnelCounts = {}
    for (const [step, count] of Object.entries(current) as [FunnelStep, number][]) {
      if (!known.has(step)) continue
      const leftover = count - (sent[step] ?? 0)
      if (leftover > 0) remaining[step] = leftover
    }
    writeJson(KEY, remaining)
  } catch {
    // Keep the counters; the next flush retries.
  }
}

if (typeof window !== "undefined") {
  // A last flush as the page goes away, so a short visit is not lost.
  window.addEventListener("pagehide", () => {
    void flushFunnel()
  })
}

/**
 * Increment one step.
 *
 * Fire-and-forget by contract: an analytics write must never fail or slow down
 * the thing the person was actually doing, so every error is swallowed here
 * rather than handled by the caller.
 */
export function track(step: FunnelStep): void {
  try {
    const counts = readFunnel()
    writeJson(KEY, { ...counts, [step]: (counts[step] ?? 0) + 1 })
    scheduleFlush()
  } catch {
    // Storage unavailable, private mode, quota. Losing a counter is fine.
  }
}

export function stepLabel(id: FunnelStep): string {
  return FUNNEL_STEPS.find((step) => step.id === id)?.label ?? id
}

/**
 * The conversion rates worth looking at, with the denominator named.
 *
 * A rate without its denominator is the easiest number to mislead yourself
 * with, so each one carries the two counts it came from.
 */
export interface Conversion {
  label: string
  from: FunnelStep
  to: FunnelStep
  /** Why this particular ratio is the one to watch. */
  why: string
}

export const CONVERSIONS: Conversion[] = [
  {
    label: "Sign-up completion",
    from: "signup_opened",
    to: "signup_completed",
    why: "Three steps before a profile exists. If this leaks, the steps are the problem.",
  },
  {
    label: "First entry published",
    from: "entry_opened",
    to: "entry_published",
    why: "The metric the product rests on. The form is demanding on purpose; too demanding kills supply.",
  },
  {
    label: "Draft to published",
    from: "entry_saved_draft",
    to: "entry_published",
    why: "People who saved a draft wanted to publish. Anyone stuck here was defeated by the form, not undecided.",
  },
  {
    label: "Search to case study",
    from: "search_used",
    to: "case_study_opened",
    why: "Whether the demand side finds something worth opening, or bounces off an empty result.",
  },
]

export function rate(counts: FunnelCounts, conversion: Conversion): number | null {
  const from = counts[conversion.from] ?? 0
  const to = counts[conversion.to] ?? 0
  if (from === 0) return null
  return Math.round((to / from) * 100)
}
