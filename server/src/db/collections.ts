import type { Collection } from "mongodb"
import { getDb } from "./client.js"
import type {
  SessionDoc, TrafficDailyDoc, TrafficEventDoc, UserDoc, WorkDoc,
} from "../types.js"

export const COLLECTION = {
  users: "users",
  works: "works",
  sessions: "sessions",
  trafficEvents: "trafficEvents",
  trafficDaily: "trafficDaily",
} as const

export const THUMBNAIL_BUCKET = "thumbnails"

/** Typed accessors — every query in the app goes through one of these. */
export const users = (): Collection<UserDoc> => getDb().collection<UserDoc>(COLLECTION.users)
export const works = (): Collection<WorkDoc> => getDb().collection<WorkDoc>(COLLECTION.works)
export const sessions = (): Collection<SessionDoc> => getDb().collection<SessionDoc>(COLLECTION.sessions)
export const trafficEvents = (): Collection<TrafficEventDoc> =>
  getDb().collection<TrafficEventDoc>(COLLECTION.trafficEvents)
export const trafficDaily = (): Collection<TrafficDailyDoc> =>
  getDb().collection<TrafficDailyDoc>(COLLECTION.trafficDaily)
