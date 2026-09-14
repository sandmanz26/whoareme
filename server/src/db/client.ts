import { MongoClient, type Db } from "mongodb"
import { env } from "../config/env.js"
import { logger } from "../lib/logger.js"

let client: MongoClient | null = null
let db: Db | null = null

export async function connect(): Promise<Db> {
  if (db) return db

  client = new MongoClient(env.MONGODB_URI, {
    // Fail fast rather than hanging a request for 30s on a dead primary.
    serverSelectionTimeoutMS: 5_000,
    maxPoolSize: 20,
    retryWrites: true,
  })

  await client.connect()
  db = client.db(env.MONGODB_DB)
  logger.info({ db: env.MONGODB_DB }, "mongo connected")
  return db
}

export function getDb(): Db {
  if (!db) throw new Error("Database not connected. Call connect() during bootstrap.")
  return db
}

export function getClient(): MongoClient {
  if (!client) throw new Error("Database not connected. Call connect() during bootstrap.")
  return client
}

export async function disconnect(): Promise<void> {
  await client?.close()
  client = null
  db = null
}

/**
 * True when the deployment supports multi-document transactions. Publish needs
 * them; a standalone mongod does not have them, and the error it throws is
 * cryptic, so we check once and say something useful instead.
 */
export async function supportsTransactions(): Promise<boolean> {
  try {
    const info = await getDb().admin().command({ hello: 1 })
    return Boolean(info.setName || info.msg === "isdbgrid")
  } catch {
    return false
  }
}
