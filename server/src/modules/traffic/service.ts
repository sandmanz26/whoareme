import type { Request } from "express"
import { ObjectId } from "mongodb"
import { trafficDaily, trafficEvents, works } from "../../db/collections.js"
import { viewerHash } from "../../lib/tokens.js"
import type { WorkDoc } from "../../types.js"
import { dailySeriesPipeline, perWorkTotalsPipeline } from "./queries.js"

export function isoDay(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function lastDays(count: number, today = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - (count - 1 - index))
    return isoDay(date)
  })
}

function viewerFor(req: Request, day: string): string {
  return viewerHash(req.ip ?? "0.0.0.0", req.header("user-agent") ?? "", day)
}

/**
 * Records a view exactly once per viewer per day. The unique index on
 * `trafficEvents` does the de-duplication, so a refresh loop cannot inflate
 * anyone's numbers — a duplicate key is the expected path, not an error.
 */
async function record(
  ownerId: ObjectId,
  type: "profile_view" | "work_open",
  workId: ObjectId | null,
  req: Request,
): Promise<boolean> {
  // Don't count the owner looking at their own page.
  if (req.user?.id.equals(ownerId)) return false

  const day = isoDay()
  try {
    await trafficEvents().insertOne({
      _id: new ObjectId(),
      ownerId,
      type,
      workId,
      day,
      viewerHash: viewerFor(req, day),
      createdAt: new Date(),
    })
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return false
    throw error
  }

  await trafficDaily().updateOne(
    { ownerId, day },
    {
      $inc: {
        total: type === "work_open" ? 1 : 0,
        profile: type === "profile_view" ? 1 : 0,
        ...(workId ? { [`work.${workId.toHexString()}`]: 1 } : {}),
      },
      $setOnInsert: { ownerId, day },
    },
    { upsert: true },
  )

  if (workId) await works().updateOne({ _id: workId }, { $inc: { "metrics.opens": 1 } })
  return true
}

export const recordProfileView = (ownerId: ObjectId, req: Request) =>
  record(ownerId, "profile_view", null, req)

export const recordWorkOpen = (work: WorkDoc, req: Request) =>
  record(work.authorId, "work_open", work._id, req)

export async function summary(ownerId: ObjectId, days = 30) {
  const range = lastDays(days)
  const from = range[0]!
  const to = range[range.length - 1]!

  const [rows, perWork] = await Promise.all([
    trafficDaily().aggregate(dailySeriesPipeline(ownerId, from, to)).toArray(),
    trafficDaily().aggregate(perWorkTotalsPipeline(ownerId, from, to)).toArray(),
  ])

  // Days with no traffic have no document. Fill the gaps here so the client
  // never has to know that absence means zero.
  const byDay = new Map(rows.map((row) => [row.day as string, row]))
  const series = range.map((day) => ({
    day,
    profile: (byDay.get(day)?.profile as number) ?? 0,
    work: (byDay.get(day)?.work as number) ?? 0,
  }))

  const titles = await works()
    .find({ authorId: ownerId }, { projection: { slug: 1, title: 1, status: 1 } })
    .toArray()
  const titleById = new Map(titles.map((w) => [w._id.toHexString(), w]))

  return {
    range: { from, to, days },
    series,
    totals: {
      profileViews: series.reduce((sum, day) => sum + day.profile, 0),
      workOpens: series.reduce((sum, day) => sum + day.work, 0),
    },
    perWork: perWork.map((row) => ({
      workId: row._id as string,
      slug: titleById.get(row._id as string)?.slug ?? null,
      title: titleById.get(row._id as string)?.title ?? "Deleted entry",
      status: titleById.get(row._id as string)?.status ?? "deleted",
      opens: row.opens as number,
    })),
  }
}
