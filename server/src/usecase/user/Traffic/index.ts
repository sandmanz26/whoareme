import TrafficDaily from "../../../models/trafficDaily.js"
import Work from "../../../models/work.js"
import type { Types } from "mongoose"

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
    const from  = range[0]!
    const to    = range[range.length - 1]!

    const [rows, titles] = await Promise.all([
      TrafficDaily.aggregate([
        { $match: { ownerId: userId, day: { $gte: from, $lte: to } } },
        { $project: { day: 1, profile: 1, work: 1 } },
      ]),
      Work.find({ authorId: userId }, "slug title status").lean(),
    ])

    const byDay   = new Map(rows.map((r) => [r.day as string, r]))
    const series  = range.map((day) => ({
      day,
      profile: (byDay.get(day)?.profile as number) ?? 0,
      work:    (byDay.get(day)?.work    as number) ?? 0,
    }))

    const titleById = new Map((titles as Array<{ _id: Types.ObjectId; slug: string; title: string; status: string }>)
      .map((w) => [w._id.toString(), w]))

    const perWorkRows = await TrafficDaily.aggregate([
      { $match: { ownerId: userId, day: { $gte: from, $lte: to } } },
      { $project: { work: 1 } },
      { $unwind: { path: "$work", preserveNullAndEmptyArrays: false } },
    ])

    const perWorkTotals: Record<string, number> = {}
    for (const row of perWorkRows) {
      const entries = Object.entries(row.work ?? {}) as Array<[string, number]>
      for (const [id, count] of entries) {
        perWorkTotals[id] = (perWorkTotals[id] ?? 0) + count
      }
    }

    return {
      range: { from, to, days },
      series,
      totals: {
        profileViews: series.reduce((s, d) => s + d.profile, 0),
        workOpens:    series.reduce((s, d) => s + d.work, 0),
      },
      perWork: Object.entries(perWorkTotals).map(([workId, opens]) => ({
        workId,
        slug:   titleById.get(workId)?.slug   ?? null,
        title:  titleById.get(workId)?.title  ?? "Deleted entry",
        status: titleById.get(workId)?.status ?? "deleted",
        opens,
      })),
    }
  },
}
