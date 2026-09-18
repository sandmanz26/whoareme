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
 * In this build the counters stay in `localStorage`, so they answer the
 * question for one browser only. `flush()` is the seam: point it at an
 * endpoint and the same counters become an aggregate. Deliberately counters
 * rather than an event stream, because a stream of timestamped events is a
 * behavioural record, and this does not need one to answer the question.
 */

const KEY = "funnel"

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
  } catch {
    // Storage unavailable, private mode, quota. Losing a counter is fine.
  }
}

export function resetFunnel(): void {
  writeJson(KEY, {})
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
