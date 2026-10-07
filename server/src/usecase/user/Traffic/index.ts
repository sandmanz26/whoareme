import TrafficDaily from "../../../models/trafficDaily.js"
import Work from "../../../models/work.js"
import { Types } from "mongoose"

function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function lastDays(count: number, today = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - (count - 1 - i))
    return isoDay(d)
  })
}

export const TrafficUsecase = {
  async GetMySummary(userId: string, days = 30) {
    const range = lastDays(days)
    const from = range[0]!
    const to = range[range.length - 1]!
    // aggregate() does not cast query values against the schema, so the owner
    // id has to be an ObjectId here even though find() accepts the raw string.
    const ownerId = new Types.ObjectId(userId)

    const [rows, titles] = await Promise.all([
      TrafficDaily.aggregate([
        { $match: { ownerId, day: { $gte: from, $lte: to } } },
        { $project: { day: 1, profile: 1, work: 1 } },
      ]),
      Work.find({ authorId: userId }, "slug title status").lean(),
    ])

    const byDay = new Map(rows.map((r) => [r.day as string, r]))
    const perWorkTotals: Record<string, number> = {}
    const series = range.map((day) => {
      const row = byDay.get(day)
      // `work` is a per-entry map, not a number. Sum it for the day's total and
      // accumulate the same values into the per-entry totals, so both views are
      // read from one query and can never disagree.
      const perWork = (row?.work ?? {}) as Record<string, number>
      for (const [id, count] of Object.entries(perWork)) {
        perWorkTotals[id] = (perWorkTotals[id] ?? 0) + count
      }
      return {
        day,
        profile: (row?.profile as number) ?? 0,
        work: Object.values(perWork).reduce((sum, n) => sum + n, 0),
      }
    })

    const titleById = new Map(
      (titles as Array<{ _id: Types.ObjectId; slug: string; title: string; status: string }>).map(
        (w) => [w._id.toString(), w],
      ),
    )

    return {
      range: { from, to, days },
      series,
      totals: {
        profileViews: series.reduce((s, d) => s + d.profile, 0),
        workOpens: series.reduce((s, d) => s + d.work, 0),
      },
      perWork: Object.entries(perWorkTotals).map(([workId, opens]) => ({
        workId,
        slug: titleById.get(workId)?.slug ?? null,
        title: titleById.get(workId)?.title ?? "Deleted entry",
        status: titleById.get(workId)?.status ?? "deleted",
        opens,
      })),
    }
  },
}
