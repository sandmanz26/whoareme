import { randomBytes } from "node:crypto"
import { ObjectId } from "mongodb"
import type { z } from "zod"
import { sessions, users, works } from "../../db/collections.js"
import { badRequest, conflict, notFound, unauthorized } from "../../lib/errors.js"
import { hashPassword, verifyPassword } from "../../lib/password.js"
import { createRefreshToken, hashToken, signAccessToken } from "../../lib/tokens.js"
import { buildSearchBlob, uniqueSlug } from "../../lib/text.js"
import { languagesFor } from "../../lib/languages.js"
import type { UserDoc } from "../../types.js"
import type { loginSchema, registerSchema, updateProfileSchema } from "./schema.js"

export function publicUser(user: UserDoc) {
  return {
    slug: user.slug,
    name: user.name,
    email: user.email,
    // The client needs this to know whether to prompt for verification, and
    // whether publishing will be refused before someone fills in a form.
    emailVerifiedAt: user.emailVerifiedAt,
    role: user.role,
    title: user.title,
    company: user.company,
    location: user.location,
    years: user.years,
    languages: user.languages ?? [],
    topics: user.topics,
    skills: user.skills,
    openToWork: user.openToWork,
    photoUrl: user.photoUrl,
    portfolioUrl: user.portfolioUrl,
    pitch: user.pitch,
    counts: user.counts,
    createdAt: user.createdAt,
  }
}

function searchBlobFor(user: Pick<UserDoc, "name" | "title" | "company" | "location" | "skills" | "topics">) {
  return buildSearchBlob([user.name, user.title, user.company, user.location, ...user.skills, ...user.topics])
}

export async function register(input: z.infer<typeof registerSchema>) {
  const existing = await users().findOne({ email: input.email }, { projection: { _id: 1 } })
  if (existing) throw conflict("An account with that email already exists.", { field: "email" })

  const slug = await uniqueSlug(input.name, async (candidate) =>
    Boolean(await users().findOne({ slug: candidate }, { projection: { _id: 1 } })),
  )

  const now = new Date()
  const doc: UserDoc = {
    _id: new ObjectId(),
    slug,
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    emailVerifiedAt: null,
    emailVerifyTokenHash: null,
    emailVerifyExpiresAt: null,
    role: input.role,
    title: input.title,
    company: "Independent",
    location: input.location,
    years: input.years,
    // Seeded from the country, then editable. A default that is usually right
    // beats an empty field nobody fills in, which is what the language filter
    // would otherwise be matching against.
    languages: languagesFor(input.location),
    topics: input.topics,
    skills: [],
    openToWork: true,
    photoUrl: "",
    portfolioUrl: input.portfolioUrl,
    pitch: input.pitch,
    seeded: false,
    status: "active",
    // Everyone registers as a member. Promotion to moderator or admin is a
    // deliberate act, never a side effect of signing up.
    access: "member",
    counts: { publishedWorks: 0, topicUsage: {} },
    searchBlob: "",
    createdAt: now,
    updatedAt: now,
  }
  doc.searchBlob = searchBlobFor(doc)

  await users().insertOne(doc)
  return doc
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await users().findOne({ email: input.email, status: "active" })
  // Hash regardless of whether the user exists, so response time does not
  // reveal which emails are registered.
  const ok = user?.passwordHash
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyPassword(input.password, "scrypt$131072$8$1$AAAA$AAAA").then(() => false)

  if (!user || !ok) throw unauthorized("Email or password is incorrect.")
  return user
}

export async function issueSession(user: UserDoc, userAgent: string, ip: string) {
  const { token, tokenHash, expiresAt } = createRefreshToken()
  await sessions().insertOne({
    _id: new ObjectId(),
    userId: user._id,
    tokenHash,
    userAgent: userAgent.slice(0, 300),
    ip,
    createdAt: new Date(),
    expiresAt,
  })

  return {
    accessToken: signAccessToken({
      sub: user._id.toHexString(),
      slug: user.slug,
      role: user.role,
      access: user.access ?? "member",
    }),
    refreshToken: token,
    refreshExpiresAt: expiresAt,
  }
}

/** Rotates on every use: the old token is deleted as the new one is issued. */
export async function refreshSession(refreshToken: string, userAgent: string, ip: string) {
  const existing = await sessions().findOneAndDelete({ tokenHash: hashToken(refreshToken) })
  if (!existing) throw unauthorized("Session expired. Sign in again.")
  if (existing.expiresAt.getTime() < Date.now()) throw unauthorized("Session expired. Sign in again.")

  const user = await users().findOne({ _id: existing.userId, status: "active" })
  if (!user) throw unauthorized("Session expired. Sign in again.")

  return { user, ...(await issueSession(user, userAgent, ip)) }
}

export async function revokeSession(refreshToken: string | undefined) {
  if (!refreshToken) return
  await sessions().deleteOne({ tokenHash: hashToken(refreshToken) })
}

export async function revokeAllSessions(userId: ObjectId) {
  await sessions().deleteMany({ userId })
}

export async function getUser(id: ObjectId) {
  const user = await users().findOne({ _id: id, status: "active" })
  if (!user) throw notFound("Account")
  return user
}

export async function updateProfile(id: ObjectId, patch: z.infer<typeof updateProfileSchema>) {
  const current = await getUser(id)
  const next = { ...current, ...patch }

  await users().updateOne(
    { _id: id },
    { $set: { ...patch, searchBlob: searchBlobFor(next), updatedAt: new Date() } },
  )

  // The author snapshot on every card has to follow the profile, or the
  // directory shows a stale title for as long as nothing else touches it.
  //
  // `years` and `languages` are in the snapshot too, and they are not
  // cosmetic: the entry grid filters on them. A profile edit that skipped the
  // fan-out would leave someone filtered into the wrong experience band on
  // their own case studies, which is worse than a stale job title because it
  // is invisible to the person it happens to.
  const cardFieldsChanged =
    patch.name !== undefined ||
    patch.title !== undefined ||
    patch.role !== undefined ||
    patch.company !== undefined ||
    patch.years !== undefined ||
    patch.languages !== undefined
  if (cardFieldsChanged) {
    await works().updateMany(
      { authorId: id },
      {
        $set: {
          "author.name": next.name,
          "author.title": next.title,
          "author.company": next.company,
          "author.photoUrl": next.photoUrl,
          "author.years": next.years,
          "author.languages": next.languages ?? [],
          updatedAt: new Date(),
        },
      },
    )
  }

  return getUser(id)
}

// ── Email verification ──────────────────────────────────────────────────

/**
 * Issue a verification token.
 *
 * Opaque random string, and only its SHA-256 is stored - the same shape as a
 * refresh token, for the same reason: a database leak must not let anyone
 * verify somebody else's address.
 *
 * There is no mail transport wired up yet, so this returns the token to the
 * caller and the caller logs it. That is fine in development and is exactly
 * the thing that must not reach production: the route says so, and the
 * response marks it.
 */
export async function requestEmailVerification(userId: ObjectId) {
  const user = await users().findOne({ _id: userId })
  if (!user) throw notFound("Account")
  if (!user.email) throw badRequest("This account has no email address.")
  if (user.emailVerifiedAt) return { alreadyVerified: true as const, token: null }

  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await users().updateOne(
    { _id: userId },
    { $set: { emailVerifyTokenHash: hashToken(token), emailVerifyExpiresAt: expiresAt, updatedAt: new Date() } },
  )
  return { alreadyVerified: false as const, token, expiresAt }
}

/**
 * Consume a token.
 *
 * Single use and time limited: the hash is cleared in the same update that
 * sets `emailVerifiedAt`, so a replay finds nothing to match. The filter does
 * the checking rather than an if-statement, which keeps it one atomic
 * operation instead of a read followed by a write two requests could race.
 */
export async function confirmEmailVerification(token: string) {
  const result = await users().findOneAndUpdate(
    {
      emailVerifyTokenHash: hashToken(token),
      emailVerifyExpiresAt: { $gt: new Date() },
    },
    {
      $set: {
        emailVerifiedAt: new Date(),
        emailVerifyTokenHash: null,
        emailVerifyExpiresAt: null,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  )
  if (!result) throw badRequest("That verification link is invalid or has expired.")
  return { slug: result.slug, email: result.email }
}
