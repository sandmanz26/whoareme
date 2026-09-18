import { funnelDaily } from "../../db/collections.js"
import { FUNNEL_STEPS, type FunnelStep } from "../../types.js"

/**
 * Funnel counters.
 *
 * `docs/BUSINESS.md` names the metric this product rests on: **completion
 * rate of a first entry**. The forms are demanding on purpose, and too
 * demanding kills supply. Shipping without measuring that is shipping without
 * being able to tell whether the central bet is wrong.
 *
 * What this is not: no cookies, no third-party script, no per-person
 * identifier, no page-view log, no path, no referrer, no timestamp finer than
 * a day. It counts how many times each named step happened and nothing about
 * who did it. Two people who publish an entry are indistinguishable here,
 * which is the point - the question is "do people finish", not "did this
 * person finish". The `$jsonSchema` validator on the collection forbids any
 * other field, so a later change cannot quietly turn this into a behavioural
 * record.
 */

export function isoDay(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Increment several steps at once.
 *
 * Batched because the client buffers: one request per click would be a
 * per-person event stream in everything but name, which is the thing this is
 * built not to be. A single `$inc` per day also means concurrent writers never
 * race - no read, no merge, nothing to lose.
 */
export async function recordSteps(counts: Partial<Record<FunnelStep, number>>): Promise<number> {
  const inc = Object.fromEntries(
    Object.entries(counts)
      .filter(([step, n]) => FUNNEL_STEPS.includes(step as FunnelStep) && Number.isFinite(n) && n > 0)
      // A cap per request, so one bad client cannot write a number that makes
      // every rate meaningless.
      .map(([step, n]) => [`counts.${step}`, Math.min(Math.trunc(n as number), 1000)]),
  )
  if (Object.keys(inc).length === 0) return 0

  await funnelDaily().updateOne(
    { _id: isoDay() },
    { $inc: inc, $set: { updatedAt: new Date() } },
    { upsert: true },
  )
  return Object.keys(inc).length
}

/**
 * Totals over a window, plus the daily rows behind them.
 *
 * The rows come back as well as the totals because a conversion rate without
 * its denominator, and without the shape it came from, is the easiest number
 * to mislead yourself with.
 */
export async function readFunnel(days = 30) {
  const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
  const rows = await funnelDaily()
    .find({ _id: { $gte: isoDay(since) } })
    .sort({ _id: 1 })
    .toArray()

  const totals: Partial<Record<FunnelStep, number>> = {}
  for (const row of rows) {
    for (const step of FUNNEL_STEPS) {
      const n = row.counts?.[step]
      if (n) totals[step] = (totals[step] ?? 0) + n
    }
  }

  return { days, from: isoDay(since), to: isoDay(), totals, series: rows }
}
