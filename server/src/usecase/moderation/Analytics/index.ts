import { z } from "zod"
import FunnelDay from "../../../models/funnelDay.js"
import { FUNNEL_STEPS } from "../../../constant/app.js"
import type { FunnelStep } from "../../../constant/app.js"

export const ingestSchema = z
  .object({
    counts: z
      .object(
        Object.fromEntries(
          FUNNEL_STEPS.map((step) => [step, z.number().int().min(1).max(1000).optional()]),
        ) as Record<FunnelStep, z.ZodOptional<z.ZodNumber>>,
      )
      .strict(),
  })
  .strict()

function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export const AnalyticsUsecase = {
  async RecordFunnel(counts: Partial<Record<FunnelStep, number>>) {
    const inc = Object.fromEntries(
      Object.entries(counts)
        .filter(
          ([step, n]) =>
            FUNNEL_STEPS.includes(step as FunnelStep) && Number.isFinite(n) && (n as number) > 0,
        )
        .map(([step, n]) => [`counts.${step}`, Math.min(Math.trunc(n as number), 1000)]),
    )
    if (Object.keys(inc).length === 0) return

    await FunnelDay.updateOne(
      { _id: isoDay() },
      { $inc: inc, $set: { updatedAt: new Date() } },
      { upsert: true },
    )
  },

  async GetFunnel(days = 30) {
    const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    const rows = await FunnelDay.find({ _id: { $gte: isoDay(since) } })
      .sort({ _id: 1 })
      .lean()

    const totals: Partial<Record<FunnelStep, number>> = {}
    for (const row of rows) {
      for (const step of FUNNEL_STEPS) {
        const n = (row.counts as Partial<Record<FunnelStep, number>>)[step]
        if (n) totals[step] = (totals[step] ?? 0) + n
      }
    }

    return { days, from: isoDay(since), to: isoDay(), totals, series: rows }
  },
}
