import {
  moderationActions, notices, reports, sessions, trafficDaily, trafficEvents, users, works,
} from "./collections.js"
import { logger } from "../lib/logger.js"

const DAYS_400_IN_SECONDS = 400 * 24 * 60 * 60

/**
 * Idempotent. Compound keys are ordered `status → filter → sort` so the
 * listing queries can walk the index in order and skip an in-memory sort.
 *
 * `topics` and `skills` are both arrays; Mongo will not build a compound index
 * across two multikey fields, which is why they get separate indexes rather
 * than one combined key.
 */
export async function ensureIndexes(): Promise<void> {
  await users().createIndexes([
    { key: { slug: 1 }, unique: true, name: "users_slug" },
    {
      key: { email: 1 },
      unique: true,
      partialFilterExpression: { email: { $type: "string" } },
      name: "users_email",
    },
    { key: { status: 1, role: 1, topics: 1 }, name: "users_status_role_topics" },
    { key: { status: 1, skills: 1 }, name: "users_status_skills" },
    // The two filter axes added after launch scope was drawn. `languages` is
    // multikey, so it cannot share a compound key with `topics` or `skills`.
    { key: { status: 1, languages: 1 }, name: "users_status_languages" },
    { key: { status: 1, years: 1 }, name: "users_status_years" },
    { key: { status: 1, "counts.publishedWorks": -1, _id: 1 }, name: "users_status_rank" },
  ])

  await works().createIndexes([
    { key: { slug: 1 }, unique: true, name: "works_slug" },
    { key: { status: 1, publishedAt: -1, _id: -1 }, name: "works_status_recent" },
    { key: { status: 1, role: 1, publishedAt: -1 }, name: "works_status_role" },
    { key: { status: 1, topics: 1, publishedAt: -1 }, name: "works_status_topics" },
    { key: { status: 1, model: 1, publishedAt: -1 }, name: "works_status_model" },
    { key: { status: 1, skills: 1 }, name: "works_status_skills" },
    { key: { authorId: 1, status: 1, publishedAt: -1 }, name: "works_author" },
    { key: { status: 1, "metrics.opens": -1 }, name: "works_status_popular" },
    // Entry filters that are really author filters, answered from the
    // denormalised snapshot so the listing still matches one document.
    { key: { status: 1, "author.languages": 1 }, name: "works_status_author_languages" },
    { key: { status: 1, "author.years": 1 }, name: "works_status_author_years" },
    {
      key: {
        title: "text", summary: "text", problem: "text",
        approach: "text", outcome: "text", skills: "text",
      },
      weights: { title: 10, summary: 6, skills: 4, problem: 2, approach: 1, outcome: 1 },
      name: "works_text",
    },
  ])

  await sessions().createIndexes([
    { key: { tokenHash: 1 }, unique: true, name: "sessions_token" },
    { key: { userId: 1 }, name: "sessions_user" },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "sessions_ttl" },
  ])

  await trafficEvents().createIndexes([
    { key: { ownerId: 1, day: 1 }, name: "traffic_owner_day" },
    {
      // Makes a repeat view by the same viewer on the same day a duplicate-key
      // no-op instead of an inflated number.
      key: { ownerId: 1, type: 1, viewerHash: 1, day: 1, workId: 1 },
      unique: true,
      name: "traffic_dedupe",
    },
    { key: { createdAt: 1 }, expireAfterSeconds: DAYS_400_IN_SECONDS, name: "traffic_ttl" },
  ])

  await trafficDaily().createIndexes([
    { key: { ownerId: 1, day: 1 }, unique: true, name: "traffic_daily_key" },
  ])


  await reports().createIndexes([
    // The queue: open reports, newest first.
    { key: { resolvedAt: 1, createdAt: -1 }, name: "reports_open_recent" },
    // What is being complained about, for the count on an entry.
    { key: { targetKind: 1, targetId: 1, resolvedAt: 1 }, name: "reports_target" },
    // One person filing the same complaint about the same thing on the same
    // day is one complaint. The hash rotates daily, so this cannot suppress a
    // genuine second report tomorrow.
    {
      key: { reporterHash: 1, targetKind: 1, targetId: 1, reason: 1 },
      unique: true,
      name: "reports_dedupe",
    },
    // Raw reports are not kept forever; the decision in the audit log is.
    { key: { createdAt: 1 }, expireAfterSeconds: DAYS_400_IN_SECONDS, name: "reports_ttl" },
  ])

  await moderationActions().createIndexes([
    { key: { createdAt: -1 }, name: "moderation_recent" },
    { key: { targetKind: 1, targetId: 1, createdAt: -1 }, name: "moderation_target" },
    { key: { actorId: 1, createdAt: -1 }, name: "moderation_actor" },
    // Deliberately no TTL. The log is the thing that has to outlive everything
    // else it refers to.
  ])

  await notices().createIndexes([
    // The author's own list: theirs, newest first.
    { key: { userId: 1, createdAt: -1 }, name: "notices_user_recent" },
    // The reviewer's queue: appeals nobody has answered yet.
    { key: { "appeal.outcome": 1, "appeal.createdAt": 1 }, name: "notices_open_appeals" },
    { key: { actionId: 1 }, name: "notices_action" },
    // Deliberately no TTL, for the same reason the audit log has none: a
    // notice is the author's copy of a record that has to outlive the thing
    // it refers to.
  ])

  logger.info("indexes ensured")
}
