import { sessions, trafficDaily, trafficEvents, users, works } from "./collections.js"
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

  logger.info("indexes ensured")
}
