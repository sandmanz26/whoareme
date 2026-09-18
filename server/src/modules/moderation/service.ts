import { ObjectId, type ClientSession } from "mongodb"
import { getClient } from "../../db/client.js"
import { moderationActions, notices, reports, siteSettings, users, works } from "../../db/collections.js"
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js"
import type {
  ModerationActionDoc,
  ModerationActionId,
  ModerationTargetKind,
  NoticeDoc,
  ReportDoc,
  ReportReason,
  RoleId,
  SiteSettingsDoc,
} from "../../types.js"

interface Actor {
  id: ObjectId
  slug: string
}

/**
 * Moderation does not need its own "hidden" flag.
 *
 * `works.status` and `users.status` already decide what the public listings
 * return, and every read path filters on them. Moderation flips those, so a
 * withheld entry is withheld by the same mechanism an author uses to
 * unpublish their own work - one code path, one thing to get right, and no
 * chance of a second flag drifting out of step with the first.
 *
 * What moderation adds is the record of who decided and why.
 */
interface Entry {
  action: ModerationActionId
  targetKind: ModerationTargetKind | null
  targetId: ObjectId | null
  targetLabel: string
  reason: string
}

async function record(entry: Entry, actor: Actor, session?: ClientSession): Promise<ObjectId> {
  const doc: ModerationActionDoc = {
    _id: new ObjectId(),
    action: entry.action,
    targetKind: entry.targetKind,
    targetId: entry.targetId,
    targetLabel: entry.targetLabel,
    reason: entry.reason,
    actorId: actor.id,
    actorSlug: actor.slug,
    createdAt: new Date(),
  }
  await moderationActions().insertOne(doc, { session })
  return doc._id
}

/**
 * Record the decision and tell the person it was about, in one step.
 *
 * Split into two calls this would eventually be made as one, and the missing
 * half would always be the notice, because nothing visibly breaks when an
 * author is not told. So the two are written together, in the same
 * transaction where there is one, and every moderation path goes through here
 * rather than through `record` directly.
 */
async function recordAndNotify(
  entry: Entry,
  recipientId: ObjectId,
  actor: Actor,
  session?: ClientSession,
): Promise<ObjectId> {
  const actionId = await record(entry, actor, session)
  const notice: NoticeDoc = {
    _id: new ObjectId(),
    userId: recipientId,
    actionId,
    action: entry.action,
    targetKind: entry.targetKind,
    targetId: entry.targetId,
    targetLabel: entry.targetLabel,
    reason: entry.reason,
    actorId: actor.id,
    createdAt: new Date(),
    readAt: null,
    appeal: null,
  }
  await notices().insertOne(notice, { session })
  return actionId
}

// ── Entries ─────────────────────────────────────────────────────────────

/**
 * Unpublishing releases the author's topic slots, exactly as their own
 * unpublish does. Leaving the counters untouched would quietly cost someone a
 * slot they are no longer using, and the quota would drift away from what is
 * actually published.
 */
export async function setWorkPublished(
  workId: ObjectId,
  published: boolean,
  reason: string,
  actor: Actor,
): Promise<void> {
  const client = getClient()
  const session = client.startSession()
  try {
    await session.withTransaction(async () => {
      const work = await works().findOne({ _id: workId }, { session })
      if (!work) throw notFound("Entry")

      const alreadyThere = published ? work.status === "published" : work.status === "draft"
      if (alreadyThere) return

      const delta = published ? 1 : -1
      await works().updateOne(
        { _id: workId },
        {
          $set: {
            status: published ? "published" : "draft",
            publishedAt: published ? new Date() : null,
            updatedAt: new Date(),
          },
        },
        { session },
      )
      await users().updateOne(
        { _id: work.authorId },
        {
          $inc: {
            "counts.publishedWorks": delta,
            ...Object.fromEntries(work.topics.map((topic) => [`counts.topicUsage.${topic}`, delta])),
          },
        },
        { session },
      )
      await recordAndNotify(
        {
          action: published ? "republish" : "unpublish",
          targetKind: "work",
          targetId: workId,
          targetLabel: work.title,
          reason,
        },
        work.authorId,
        actor,
        session,
      )
    })
  } finally {
    await session.endSession()
  }
}

// ── People ──────────────────────────────────────────────────────────────

/**
 * Suspending a person withholds their work too.
 *
 * A profile that 404s while its case studies stay on the grid is not a
 * suspension; it is a broken link. The entries keep `status: "published"` so
 * reinstating restores exactly what was there, and a denormalised
 * `authorSuspended` flag on each one keeps them out of the listings meanwhile.
 *
 * The flag is necessary because the listings match on the work document alone.
 * An earlier version of this comment claimed the listings filtered on the
 * author's status; they do not, and the smoke test caught it.
 */
export async function setUserSuspended(
  userId: ObjectId,
  suspended: boolean,
  reason: string,
  actor: Actor,
): Promise<void> {
  const user = await users().findOne({ _id: userId })
  if (!user) throw notFound("Person")
  if (user.status === "deleted") throw notFound("Person")

  await users().updateOne(
    { _id: userId },
    { $set: { status: suspended ? "suspended" : "active", updatedAt: new Date() } },
  )
  // The listings match on the work document alone - there is no join to the
  // author - so the author's status has to be carried onto their entries or a
  // suspended profile would 404 while its case studies stayed on the grid.
  // Same fan-out the profile edit already uses for the author snapshot.
  await works().updateMany({ authorId: userId }, { $set: { authorSuspended: suspended } })
  await recordAndNotify(
    {
      action: suspended ? "suspend" : "reinstate",
      targetKind: "user",
      targetId: userId,
      targetLabel: user.name,
      reason,
    },
    userId,
    actor,
  )
}

// ── Reports ─────────────────────────────────────────────────────────────

export async function fileReport(input: {
  targetKind: ModerationTargetKind
  targetId: ObjectId
  reason: ReportReason
  note: string
  reporterHash: string
}): Promise<void> {
  const exists =
    input.targetKind === "work"
      ? await works().countDocuments({ _id: input.targetId }, { limit: 1 })
      : await users().countDocuments({ _id: input.targetId }, { limit: 1 })
  if (!exists) throw notFound(input.targetKind === "work" ? "Entry" : "Person")

  // One person filing the same complaint repeatedly is one complaint. The
  // unique index does the enforcing; this keeps the duplicate quiet rather
  // than turning it into an error the reporter has to understand.
  const doc: ReportDoc = {
    _id: new ObjectId(),
    targetKind: input.targetKind,
    targetId: input.targetId,
    reason: input.reason,
    note: input.note,
    reporterHash: input.reporterHash,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: new Date(),
  }
  await reports()
    .insertOne(doc)
    .catch((error: { code?: number }) => {
      if (error.code !== 11000) throw error
    })
}

export async function openReports(limit = 100) {
  return reports().find({ resolvedAt: null }).sort({ createdAt: -1 }).limit(limit).toArray()
}

export async function resolveReport(
  reportId: ObjectId,
  reason: string,
  actor: Actor,
): Promise<void> {
  const report = await reports().findOneAndUpdate(
    { _id: reportId, resolvedAt: null },
    { $set: { resolvedAt: new Date(), resolvedBy: actor.id } },
  )
  if (!report) throw notFound("Report")

  await record(
    {
      action: "dismiss",
      targetKind: report.targetKind,
      targetId: report.targetId,
      targetLabel: "Report closed",
      reason,
    },
    actor,
  )
}

// ── Audit log ───────────────────────────────────────────────────────────

export async function auditLog(limit = 100) {
  return moderationActions().find({}).sort({ createdAt: -1 }).limit(limit).toArray()
}

// ── Notices and appeals ─────────────────────────────────────────────────

/** The author's own notices, newest first. */
export async function noticesFor(userId: ObjectId, limit = 50) {
  return notices().find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray()
}

export async function markNoticeRead(userId: ObjectId, noticeId: ObjectId): Promise<void> {
  const result = await notices().updateOne(
    { _id: noticeId, userId, readAt: null },
    { $set: { readAt: new Date() } },
  )
  // Already read is not an error: the client marks on open, and opening twice
  // is a normal thing to do.
  if (result.matchedCount === 0) {
    const exists = await notices().countDocuments({ _id: noticeId, userId }, { limit: 1 })
    if (!exists) throw notFound("Notice")
  }
}

/**
 * Contest a decision.
 *
 * One appeal per notice, enforced by the guard in the filter rather than a
 * read followed by a write. A second appeal would not be recourse; it would
 * be a way to keep a decision permanently open, which costs the reviewer and
 * gains the author nothing.
 */
export async function appealNotice(
  userId: ObjectId,
  noticeId: ObjectId,
  text: string,
): Promise<NoticeDoc> {
  const result = await notices().findOneAndUpdate(
    { _id: noticeId, userId, appeal: null },
    { $set: { appeal: { text, createdAt: new Date(), outcome: null, outcomeReason: "", decidedAt: null, decidedBy: null } } },
    { returnDocument: "after" },
  )
  if (!result) {
    const existing = await notices().findOne({ _id: noticeId, userId })
    if (!existing) throw notFound("Notice")
    throw conflict("That decision has already been appealed.")
  }
  return result
}

/** The reviewer's queue: appeals filed and not yet answered, oldest first. */
export async function openAppeals(limit = 100) {
  return notices()
    .find({ appeal: { $ne: null }, "appeal.outcome": null })
    .sort({ "appeal.createdAt": 1 })
    .limit(limit)
    .toArray()
}

/**
 * Decide an appeal.
 *
 * Two things make this a real appeal rather than a record of one:
 *
 * 1. **A different reviewer.** Whoever took the decision cannot review it.
 *    Enforced here, not in the UI, because the UI is not the thing that has
 *    to hold.
 * 2. **Overturning actually reverses.** An outcome that changed nothing would
 *    be worse than no appeal at all, because it would look like recourse. So
 *    `overturned` republishes the entry or reinstates the person, and that
 *    reversal is recorded and notified in its own right. `upheld` means the
 *    original decision stands.
 */
export async function decideAppeal(
  noticeId: ObjectId,
  outcome: "upheld" | "overturned",
  reason: string,
  actor: Actor,
): Promise<void> {
  const notice = await notices().findOne({ _id: noticeId })
  if (!notice) throw notFound("Notice")
  if (!notice.appeal) throw badRequest("That notice has not been appealed.")
  if (notice.appeal.outcome) throw conflict("That appeal has already been decided.")
  if (notice.actorId.equals(actor.id)) {
    throw forbidden("An appeal has to be reviewed by someone other than whoever took the decision.")
  }

  // Reverse first. If the reversal fails the appeal stays open, which is the
  // safe way round: an appeal recorded as upheld with nothing undone is the
  // exact failure this whole path exists to prevent.
  if (outcome === "overturned" && notice.targetId) {
    if (notice.action === "unpublish" && notice.targetKind === "work") {
      await setWorkPublished(notice.targetId, true, `Appeal overturned the decision: ${reason}`, actor)
    } else if (notice.action === "suspend" && notice.targetKind === "user") {
      await setUserSuspended(notice.targetId, false, `Appeal overturned the decision: ${reason}`, actor)
    }
  }

  await notices().updateOne(
    { _id: noticeId, "appeal.outcome": null },
    {
      $set: {
        "appeal.outcome": outcome,
        "appeal.outcomeReason": reason,
        "appeal.decidedAt": new Date(),
        "appeal.decidedBy": actor.id,
      },
    },
  )

  await record(
    {
      action: "appeal",
      targetKind: notice.targetKind,
      targetId: notice.targetId,
      targetLabel: notice.targetLabel,
      reason: `Appeal ${outcome}: ${reason}`,
    },
    actor,
  )
}

// ── Site settings ───────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SiteSettingsDoc = {
  _id: "site",
  contact: {
    email: "hello@whoareyou.directory",
    location: "Jakarta, ID",
    responseTime: "We answer within two working days.",
  },
  copy: {},
  disabledRoles: [],
  updatedAt: new Date(0),
  updatedBy: null,
}

/** Public: read by every render, so it must never 404. */
export async function readSettings(): Promise<SiteSettingsDoc> {
  return (await siteSettings().findOne({ _id: "site" })) ?? DEFAULT_SETTINGS
}

export async function writeSettings(
  patch: Partial<Pick<SiteSettingsDoc, "contact" | "copy" | "disabledRoles">>,
  reason: string,
  actor: Actor,
): Promise<SiteSettingsDoc> {
  const next = await siteSettings().findOneAndUpdate(
    { _id: "site" },
    {
      $set: { ...patch, updatedAt: new Date(), updatedBy: actor.id },
      // The validator requires `contact`, so a first write that only touches
      // `disabledRoles` must still create a complete document.
      $setOnInsert: Object.fromEntries(
        Object.entries({
          contact: DEFAULT_SETTINGS.contact,
          copy: DEFAULT_SETTINGS.copy,
          disabledRoles: DEFAULT_SETTINGS.disabledRoles,
        }).filter(([key]) => !(key in patch)),
      ),
    },
    { upsert: true, returnDocument: "after" },
  )
  await record(
    {
      action: "settings",
      targetKind: null,
      targetId: null,
      targetLabel: Object.keys(patch).join(", ") || "settings",
      reason,
    },
    actor,
  )
  return next ?? DEFAULT_SETTINGS
}

export type { RoleId }
