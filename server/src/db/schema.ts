import { getDb } from "./client.js"
import { COLLECTION } from "./collections.js"
import { BUSINESS_MODELS, ROLES, TOPICS } from "../types.js"
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
      years: { bsonType: ["int", "double", "null"], minimum: 0, maximum: 60 },
      topics: { bsonType: "array", maxItems: 12, items: { enum: [...TOPICS] } },
      skills: { bsonType: "array", maxItems: 24, items: { bsonType: "string", maxLength: 60 } },
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

export async function applyValidators(): Promise<void> {
  await apply(COLLECTION.users, USER_VALIDATOR)
  await apply(COLLECTION.works, WORK_VALIDATOR)
  // sessions and traffic are machine-written only; indexes carry their rules.
  for (const name of [COLLECTION.sessions, COLLECTION.trafficEvents, COLLECTION.trafficDaily]) {
    const exists = await getDb().listCollections({ name }).toArray()
    if (exists.length === 0) await getDb().createCollection(name)
  }
}
