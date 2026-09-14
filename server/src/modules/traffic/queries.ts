import type { Document, ObjectId } from "mongodb"

/**
 * Per-entry totals, summed in the pipeline.
 *
 * `$mergeObjects` over the daily maps would take the last value per key rather
 * than summing them, so the map is exploded to key/value pairs, grouped and
 * re-assembled.
 */
export function perWorkTotalsPipeline(ownerId: ObjectId, from: string, to: string): Document[] {
  return [
    { $match: { ownerId, day: { $gte: from, $lte: to } } },
    { $project: { pairs: { $objectToArray: "$work" } } },
    { $unwind: "$pairs" },
    { $group: { _id: "$pairs.k", opens: { $sum: "$pairs.v" } } },
    { $sort: { opens: -1 } },
  ]
}

export function dailySeriesPipeline(ownerId: ObjectId, from: string, to: string): Document[] {
  return [
    { $match: { ownerId, day: { $gte: from, $lte: to } } },
    { $sort: { day: 1 } },
    { $project: { _id: 0, day: 1, profile: 1, work: "$total" } },
  ]
}
