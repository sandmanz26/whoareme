import { randomBytes } from "node:crypto"
import { z } from "zod"
import { Types } from "mongoose"
import User from "../../../models/user.js"
import Work from "../../../models/work.js"
import TrafficEvent from "../../../models/trafficEvent.js"
import TrafficDaily from "../../../models/trafficDaily.js"
import Notice from "../../../models/notice.js"
import Report from "../../../models/report.js"
import { hashPassword, verifyPassword } from "../../../service/password.js"
import { signToken } from "../../../service/token.js"
import { hashToken } from "../../../utils/hash.js"
import { removeStoredFile } from "../../../utils/files.js"
import { uniqueSlug } from "../../../utils/slug.js"
import { buildSearchBlob } from "../../../utils/text.js"
import { languagesFor } from "../../../utils/languages.js"
import { badRequest, notFound, unauthorized } from "../../../middleware/error.js"
import { logger } from "../../../libraries/logger.js"
import { ROLES, TOPICS, isRoleLive } from "../../../constant/app.js"

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(200),
  location: z.string().trim().max(120).default(""),
  role: z.enum(ROLES).refine(isRoleLive, { message: "That craft is not open yet." }),
  title: z.string().trim().max(120).default(""),
  years: z.coerce.number().int().min(0).max(60),
  topics: z.array(z.enum(TOPICS)).max(4).default([]),
  portfolioUrl: z.string().trim().url().max(500).or(z.literal("")).default(""),
  pitch: z.string().trim().max(400).default(""),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
})

export const updateProfileSchema = registerSchema
  .omit({ password: true, email: true })
  .partial()
  .extend({
    company: z.string().trim().min(1).max(120).optional(),
    skills: z.array(z.string().trim().min(1).max(60)).max(24).optional(),
    languages: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    openToWork: z.boolean().optional(),
  })

function searchBlobFor(u: {
  name: string
  title: string
  company: string
  location: string
  skills: string[]
  topics: string[]
}) {
  return buildSearchBlob([u.name, u.title, u.company, u.location, ...u.skills, ...u.topics])
}

import type { IUser } from "../../../interface/IUser.js"

type UserLike = Pick<
  IUser,
  | "_id"
  | "slug"
  | "name"
  | "email"
  | "emailVerifiedAt"
  | "role"
  | "access"
  | "status"
  | "title"
  | "company"
  | "location"
  | "years"
  | "languages"
  | "topics"
  | "skills"
  | "openToWork"
  | "photoUrl"
  | "portfolioUrl"
  | "pitch"
  | "counts"
  | "createdAt"
>

/** Safe for any audience — no PII, no internal state. */
export function publicUser(user: UserLike) {
  return {
    id: user._id.toString(),
    slug: user.slug,
    name: user.name,
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
    counts: { publishedWorks: user.counts.publishedWorks },
    createdAt: user.createdAt,
  }
}

/** Owner-only. Adds email, emailVerifiedAt, access level, and full quota counts. */
function ownerUser(user: UserLike) {
  return {
    ...publicUser(user),
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    access: user.access ?? "member",
    status: user.status ?? "active",
    counts: user.counts,
  }
}

const EXISTS_NOTICE_COOLDOWN_MS = 10 * 60 * 1000
const existsNoticeAt = new Map<string, number>()

export const AuthUsecase = {
  /**
   * Creates an account, or silently does nothing when the address is taken.
   *
   * The response is identical either way, so the endpoint cannot be used to
   * enumerate accounts. The cost is that signup no longer signs the person in:
   * they confirm the address by email and then sign in. When the address is
   * already registered, its owner gets a "you already have an account" email,
   * throttled per address so this cannot be used to flood an inbox.
   */
  async Register(input: z.infer<typeof registerSchema>) {
    const existing = await User.findOne({ email: input.email }).lean()
    if (existing) {
      // Equalise the timing with the created path, where bcrypt dominates.
      await hashPassword(input.password).catch(() => {})
      const now = Date.now()
      const last = existsNoticeAt.get(input.email) ?? 0
      const notify = now - last >= EXISTS_NOTICE_COOLDOWN_MS
      if (notify) existsNoticeAt.set(input.email, now)
      return {
        kind: "existing" as const,
        notify,
        email: existing.email as string,
        name: existing.name,
      }
    }

    const slug = await uniqueSlug(input.name, async (candidate) =>
      Boolean(await User.exists({ slug: candidate })),
    )

    const passwordHash = await hashPassword(input.password)
    const verifyToken = randomBytes(32).toString("base64url")

    const user = await User.create({
      slug,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      title: input.title,
      company: "Independent",
      location: input.location,
      years: input.years,
      languages: languagesFor(input.location),
      topics: input.topics,
      skills: [],
      openToWork: true,
      photoUrl: "",
      portfolioUrl: input.portfolioUrl,
      pitch: input.pitch,
      emailVerifyTokenHash: hashToken(verifyToken),
      emailVerifyExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      token: null,
      status: "active",
      access: "member",
      counts: { publishedWorks: 0, topicUsage: {} },
      searchBlob: "",
    })

    user.searchBlob = searchBlobFor({
      name: user.name,
      title: user.title,
      company: user.company,
      location: user.location,
      skills: user.skills,
      topics: user.topics as string[],
    })
    await user.save()

    return {
      kind: "created" as const,
      email: user.email as string,
      name: user.name,
      verifyToken,
    }
  },

  async Login(input: z.infer<typeof loginSchema>) {
    const user = await User.findOne({
      email: input.email,
      status: { $in: ["active", "suspended"] },
    })
    const ok = user?.passwordHash
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyPassword(
          input.password,
          "$2b$11$invalidhashpadding000000000000000000000000000000",
        ).then(() => false)

    if (!user || !ok) throw unauthorized("Email or password is incorrect.")

    const token = signToken({
      sub: user._id.toString(),
      slug: user.slug,
      role: user.role as never,
      access: (user.access ?? "member") as never,
    })
    user.token = token
    await user.save()

    return { user: ownerUser(user as unknown as UserLike), token }
  },

  async Logout(userId: string) {
    await User.updateOne({ _id: userId }, { $set: { token: null, updatedAt: new Date() } })
  },

  /**
   * Erase the account and everything attached to it.
   *
   * Content and uploads are removed for real, not moved into a soft-deleted
   * state: someone who deletes their profile is entitled to have it gone, not
   * merely hidden. The one thing kept is the moderation decision record, which
   * the terms and content policy both name, because a log the subject can erase
   * cannot hold moderation to account. The user row survives as a scrubbed
   * tombstone so that record still points at an actor.
   */
  async DeleteAccount(userId: string) {
    const user = await User.findOne({ _id: userId, deletedAt: null }).lean()
    if (!user) throw notFound("Account")

    const now = new Date()
    const authorId = new Types.ObjectId(userId)
    const works = await Work.find({ authorId, deletedAt: null }, "_id thumbnailPath").lean()
    const workIds = works.map((w) => w._id as Types.ObjectId)

    // Files first: once the rows are gone they cannot be found to clean up, and
    // an orphaned upload is exactly the copy a deletion request is about.
    await Promise.all([
      removeStoredFile(user.photoUrl),
      ...works.map((w) => removeStoredFile(w.thumbnailPath)),
    ])

    await Promise.all([
      Work.deleteMany({ authorId }),
      TrafficEvent.deleteMany({ ownerId: authorId }),
      TrafficDaily.deleteMany({ ownerId: authorId }),
      Notice.deleteMany({ userId: authorId }),
      Report.deleteMany({
        $or: [
          { targetKind: "user", targetId: authorId },
          { targetKind: "work", targetId: { $in: workIds } },
        ],
      }),
      Report.updateMany({ resolvedBy: authorId }, { $set: { resolvedBy: null } }),
      User.updateOne(
        { _id: authorId },
        {
          $set: {
            email: null,
            passwordHash: null,
            emailVerifyTokenHash: null,
            emailVerifyExpiresAt: null,
            passwordResetTokenHash: null,
            passwordResetExpiresAt: null,
            token: null,
            status: "deleted",
            deletedAt: now,
            deletedBy: authorId,
            updatedAt: now,
            name: "Deleted account",
            title: "",
            company: "",
            location: "",
            years: 0,
            languages: [],
            topics: [],
            skills: [],
            openToWork: false,
            photoUrl: "",
            portfolioUrl: "",
            pitch: "",
            searchBlob: "",
            counts: { publishedWorks: 0, topicUsage: {} },
          },
        },
      ),
    ])
  },

  async Me(userId: string) {
    const user = await User.findOne({
      _id: userId,
      status: { $in: ["active", "suspended"] },
    }).lean()
    if (!user) throw notFound("Account")
    return ownerUser(user as unknown as UserLike)
  },

  async UpdateProfile(userId: string, patch: z.infer<typeof updateProfileSchema>) {
    const current = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!current) throw notFound("Account")

    const searchBlob = searchBlobFor({
      name: (patch.name ?? current.name) as string,
      title: (patch.title ?? current.title) as string,
      company: (patch.company ?? current.company) as string,
      location: (patch.location ?? current.location) as string,
      skills: (patch.skills ?? current.skills) as string[],
      topics: current.topics as string[],
    })

    await User.updateOne({ _id: userId }, { $set: { ...patch, searchBlob, updatedAt: new Date() } })

    // `role` is not in the author snapshot: each entry carries its own craft, so
    // changing the profile craft must not trigger a rewrite of every entry.
    const cardChanged =
      patch.name !== undefined ||
      patch.title !== undefined ||
      patch.company !== undefined ||
      patch.years !== undefined ||
      patch.languages !== undefined ||
      patch.location !== undefined
    if (cardChanged) {
      const newName = patch.name ?? current.name
      const newTitle = patch.title ?? current.title
      const newCompany = patch.company ?? current.company
      const newYears = patch.years ?? current.years
      const newLanguages = patch.languages ?? current.languages ?? []
      const newLocation = patch.location ?? current.location ?? ""

      await Work.updateMany(
        { authorId: userId },
        [
          {
            $set: {
              "author.name": newName,
              "author.title": newTitle,
              "author.company": newCompany,
              "author.photoUrl": current.photoUrl,
              "author.years": newYears,
              "author.languages": newLanguages,
              searchBlob: {
                $toLower: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ["$title", ""] },
                        " ",
                        { $ifNull: ["$summary", ""] },
                        " ",
                        { $ifNull: ["$problem", ""] },
                        " ",
                        { $ifNull: ["$approach", ""] },
                        " ",
                        { $ifNull: ["$outcome", ""] },
                        " ",
                        {
                          $reduce: {
                            input: { $ifNull: ["$sections", []] },
                            initialValue: "",
                            in: {
                              $concat: [
                                "$$value",
                                " ",
                                { $ifNull: ["$$this.heading", ""] },
                                " ",
                                { $ifNull: ["$$this.body", ""] },
                              ],
                            },
                          },
                        },
                        " ",
                        {
                          $reduce: {
                            input: { $ifNull: ["$details", []] },
                            initialValue: "",
                            in: {
                              $concat: [
                                "$$value",
                                " ",
                                { $ifNull: ["$$this.label", ""] },
                                " ",
                                { $ifNull: ["$$this.value", ""] },
                              ],
                            },
                          },
                        },
                        " ",
                        {
                          $reduce: {
                            input: { $ifNull: ["$skills", []] },
                            initialValue: "",
                            in: { $concat: ["$$value", " ", "$$this"] },
                          },
                        },
                        " ",
                        {
                          $reduce: {
                            input: { $ifNull: ["$stack", []] },
                            initialValue: "",
                            in: { $concat: ["$$value", " ", "$$this"] },
                          },
                        },
                        " ",
                        {
                          $reduce: {
                            input: { $ifNull: ["$topics", []] },
                            initialValue: "",
                            in: { $concat: ["$$value", " ", "$$this"] },
                          },
                        },
                        " ",
                        { $ifNull: ["$model", ""] },
                        " ",
                        newName,
                        " ",
                        newCompany,
                        " ",
                        newLocation,
                      ],
                    },
                  },
                },
              },
              updatedAt: new Date(),
            },
          },
        ],
        // Mongoose 9 rejects an array update unless the pipeline is explicit.
        { updatePipeline: true },
      ).catch((err: unknown) => {
        // The profile itself is already saved. The snapshot fan-out is repair
        // work that can be retried; log it rather than failing the whole edit.
        logger.error({ err, userId }, "author snapshot fan-out failed")
      })
    }

    const updated = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!updated) throw notFound("Account")
    return ownerUser(updated as unknown as UserLike)
  },

  async RequestEmailVerification(userId: string) {
    const user = await User.findOne({ _id: userId }).lean()
    if (!user) throw notFound("Account")
    if (!user.email) throw badRequest("This account has no email address.")
    if (user.emailVerifiedAt) return { alreadyVerified: true as const, token: null }

    const token = randomBytes(32).toString("base64url")
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          emailVerifyTokenHash: hashToken(token),
          emailVerifyExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      },
    )
    return { alreadyVerified: false as const, token, expiresAt }
  },

  async ConfirmEmailVerification(token: string) {
    const user = await User.findOneAndUpdate(
      { emailVerifyTokenHash: hashToken(token), emailVerifyExpiresAt: { $gt: new Date() } },
      {
        $set: {
          emailVerifiedAt: new Date(),
          emailVerifyTokenHash: null,
          emailVerifyExpiresAt: null,
          updatedAt: new Date(),
        },
      },
      { new: true },
    ).lean()
    if (!user) throw badRequest("That verification link is invalid or has expired.")
    return { slug: user.slug, email: user.email }
  },

  async RequestPasswordReset(email: string) {
    const user = await User.findOne({ email: email.toLowerCase().trim(), status: "active" }).lean()
    if (!user || !user.email) return { token: null, user: null }

    const token = randomBytes(32).toString("base64url")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetTokenHash: hashToken(token),
          passwordResetExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      },
    )
    return { token, user }
  },

  async ConfirmPasswordReset(token: string, password: string) {
    const user = await User.findOneAndUpdate(
      { passwordResetTokenHash: hashToken(token), passwordResetExpiresAt: { $gt: new Date() } },
      {
        $set: { passwordResetTokenHash: null, passwordResetExpiresAt: null, updatedAt: new Date() },
      },
      { new: true },
    )
    if (!user) throw badRequest("That reset link is invalid or has expired.")

    const passwordHash = await hashPassword(password)
    const newToken = signToken({
      sub: user._id.toString(),
      slug: user.slug,
      role: user.role as never,
      access: (user.access ?? "member") as never,
    })
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordHash, token: newToken, updatedAt: new Date() } },
    )
    return { user: ownerUser(user as unknown as UserLike), token: newToken }
  },

  async GetUserById(userId: string) {
    const user = await User.findOne({ _id: userId, status: "active" }, "email name").lean()
    if (!user) throw notFound("Account")
    return user
  },
}
