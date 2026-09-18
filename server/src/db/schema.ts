import { getDb } from "./client.js"
import { COLLECTION } from "./collections.js"
import {
  ACCESS_LEVELS, BUSINESS_MODELS, FUNNEL_STEPS, MODERATION_ACTIONS, REPORT_REASONS, ROLES, TOPICS,
} from "../types.js"
import { logger } from "../lib/logger.js"

const SLUG = "^[a-z0-9][a-z0-9-]{1,120}$"

/**
 * `$jsonSchema` validators, applied with collMod so they can be tightened
 * without a migration. These are the last line of defence: a script that
 * bypasses the API still cannot write a malformed document.
 *
 * `validationLevel: "moderate"` so updates to documents that predate a rule
 * are not rejected outright — tighten to "strict" once a backfill has run.
 */
const USER_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["slug", "name", "role", "status", "createdAt"],
    properties: {
      slug: { bsonType: "string", pattern: SLUG },
      name: { bsonType: "string", minLength: 1, maxLength: 120 },
      email: { bsonType: ["string", "null"], pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$" },
      role: { enum: [...ROLES] },
      access: { enum: [...ACCESS_LEVELS] },
      years: { bsonType: ["int", "double", "null"], minimum: 0, maximum: 60 },
      topics: { bsonType: "array", maxItems: 12, items: { enum: [...TOPICS] } },
      skills: { bsonType: "array", maxItems: 24, items: { bsonType: "string", maxLength: 60 } },
      languages: { bsonType: "array", maxItems: 12, items: { bsonType: "string", maxLength: 40 } },
      status: { enum: ["active", "suspended", "deleted"] },
      counts: {
        bsonType: "object",
        properties: {
          publishedWorks: { bsonType: ["int", "double"], minimum: 0 },
          topicUsage: { bsonType: "object" },
        },
      },
    },
  },
}

const WORK_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["slug", "authorId", "mode", "role", "title", "status", "createdAt"],
    properties: {
      slug: { bsonType: "string", pattern: SLUG },
      authorId: { bsonType: "objectId" },
      mode: { enum: ["template", "custom"] },
      role: { enum: [...ROLES] },
      access: { enum: [...ACCESS_LEVELS] },
      status: { enum: ["draft", "published"] },
      title: { bsonType: "string", minLength: 1, maxLength: 90 },
      summary: { bsonType: "string", maxLength: 140 },
      year: { bsonType: ["int", "double"], minimum: 1980, maximum: 2100 },
      // Mirrors the UI limits: four topics, eight skills.
      topics: { bsonType: "array", maxItems: 4, items: { enum: [...TOPICS] } },
      skills: { bsonType: "array", maxItems: 8, items: { bsonType: "string", maxLength: 60 } },
      model: { bsonType: ["string", "null"], enum: [...BUSINESS_MODELS, null] },
      details: {
        bsonType: "array",
        maxItems: 12,
        items: {
          bsonType: "object",
          required: ["label", "value"],
          properties: {
            label: { bsonType: "string", maxLength: 60 },
            value: { bsonType: "string", maxLength: 200 },
            proof: { bsonType: "bool" },
          },
        },
      },
      links: {
        bsonType: "array",
        maxItems: 8,
        items: {
          bsonType: "object",
          required: ["href"],
          properties: {
            label: { bsonType: "string", maxLength: 60 },
            href: { bsonType: "string", pattern: "^https?://" },
          },
        },
      },
    },
  },
}

async function apply(name: string, validator: object) {
  const db = getDb()
  const existing = await db.listCollections({ name }).toArray()
  if (existing.length === 0) {
    await db.createCollection(name, { validator, validationLevel: "moderate", validationAction: "error" })
    logger.info({ collection: name }, "collection created with validator")
    return
  }
  await db.command({ collMod: name, validator, validationLevel: "moderate", validationAction: "error" })
  logger.info({ collection: name }, "validator updated")
}

const REPORT_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["targetKind", "targetId", "reason", "reporterHash", "createdAt"],
    properties: {
      targetKind: { enum: ["work", "user"] },
      targetId: { bsonType: "objectId" },
      reason: { enum: [...REPORT_REASONS] },
      note: { bsonType: "string", maxLength: 1000 },
      reporterHash: { bsonType: "string", minLength: 32, maxLength: 32 },
      resolvedAt: { bsonType: ["date", "null"] },
      resolvedBy: { bsonType: ["objectId", "null"] },
      createdAt: { bsonType: "date" },
    },
  },
}

/**
 * `reason` is required here, not just at the API edge.
 *
 * The edge can be bypassed by a script; this validator cannot. An audit row
 * without a reason is worse than no row, because it looks like a record while
 * answering none of the questions a record exists to answer.
 */
const MODERATION_ACTION_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["action", "targetLabel", "reason", "actorId", "createdAt"],
    properties: {
      action: { enum: [...MODERATION_ACTIONS] },
      targetKind: { enum: ["work", "user", null] },
      targetId: { bsonType: ["objectId", "null"] },
      targetLabel: { bsonType: "string", minLength: 1, maxLength: 200 },
      reason: { bsonType: "string", minLength: 1, maxLength: 500 },
      actorId: { bsonType: "objectId" },
      actorSlug: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  },
}

/**
 * A notice without a reason is the failure mode this exists to prevent, so
 * `reason` is required here as well as at the edge - same argument as the
 * audit log, and the same reason the edge alone is not enough.
 */
const NOTICE_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "actionId", "action", "targetLabel", "reason", "actorId", "createdAt"],
    properties: {
      userId: { bsonType: "objectId" },
      actionId: { bsonType: "objectId" },
      action: { enum: [...MODERATION_ACTIONS] },
      targetKind: { enum: ["work", "user", null] },
      targetId: { bsonType: ["objectId", "null"] },
      targetLabel: { bsonType: "string", minLength: 1, maxLength: 200 },
      reason: { bsonType: "string", minLength: 1, maxLength: 500 },
      actorId: { bsonType: "objectId" },
      createdAt: { bsonType: "date" },
      readAt: { bsonType: ["date", "null"] },
      appeal: {
        bsonType: ["object", "null"],
        required: ["text", "createdAt"],
        properties: {
          text: { bsonType: "string", minLength: 1, maxLength: 1500 },
          createdAt: { bsonType: "date" },
          outcome: { enum: ["upheld", "overturned", null] },
          outcomeReason: { bsonType: "string", maxLength: 500 },
          decidedAt: { bsonType: ["date", "null"] },
          decidedBy: { bsonType: ["objectId", "null"] },
        },
      },
    },
  },
}

/**
 * Counters and a day, and nothing that could identify anyone. The validator
 * is the place that guarantee is enforceable: a later change that tried to
 * add a viewer field to this collection would be rejected by the database.
 */
const FUNNEL_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["_id", "counts", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      counts: {
        bsonType: "object",
        additionalProperties: false,
        properties: Object.fromEntries(
          FUNNEL_STEPS.map((step) => [step, { bsonType: ["int", "double"], minimum: 0 }]),
        ),
      },
      updatedAt: { bsonType: "date" },
    },
  },
}

const SITE_SETTINGS_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["_id", "contact", "updatedAt"],
    properties: {
      _id: { enum: ["site"] },
      contact: {
        bsonType: "object",
        required: ["email", "location"],
        properties: {
          email: { bsonType: "string", pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$" },
          location: { bsonType: "string", maxLength: 120 },
          responseTime: { bsonType: "string", maxLength: 200 },
        },
      },
      copy: { bsonType: "object" },
      disabledRoles: { bsonType: "array", items: { enum: [...ROLES] } },
      updatedAt: { bsonType: "date" },
      updatedBy: { bsonType: ["objectId", "null"] },
    },
  },
}

export async function applyValidators(): Promise<void> {
  await apply(COLLECTION.users, USER_VALIDATOR)
  await apply(COLLECTION.works, WORK_VALIDATOR)
  await apply(COLLECTION.reports, REPORT_VALIDATOR)
  await apply(COLLECTION.moderationActions, MODERATION_ACTION_VALIDATOR)
  await apply(COLLECTION.notices, NOTICE_VALIDATOR)
  await apply(COLLECTION.funnelDaily, FUNNEL_VALIDATOR)
  await apply(COLLECTION.siteSettings, SITE_SETTINGS_VALIDATOR)
  // sessions and traffic are machine-written only; indexes carry their rules.
  for (const name of [COLLECTION.sessions, COLLECTION.trafficEvents, COLLECTION.trafficDaily]) {
    const exists = await getDb().listCollections({ name }).toArray()
    if (exists.length === 0) await getDb().createCollection(name)
  }
}
