import { randomBytes } from "node:crypto"
import { z } from "zod"
import User from "../../../models/user.js"
import Work from "../../../models/work.js"
import { hashPassword, verifyPassword } from "../../../service/password.js"
import { signToken } from "../../../service/token.js"
import { hashToken } from "../../../utils/hash.js"
import { uniqueSlug } from "../../../utils/slug.js"
import { buildSearchBlob } from "../../../utils/text.js"
import { languagesFor } from "../../../utils/languages.js"
import { badRequest, conflict, notFound, unauthorized } from "../../../middleware/error.js"
import { ROLES, TOPICS, isRoleLive } from "../../../constant/app.js"

export const registerSchema = z.object({
  name:         z.string().trim().min(2).max(120),
  email:        z.string().trim().toLowerCase().email(),
  password:     z.string().min(10).max(200),
  location:     z.string().trim().max(120).default(""),
  role:         z.enum(ROLES).refine(isRoleLive, { message: "That craft is not open yet." }),
  title:        z.string().trim().max(120).default(""),
  years:        z.coerce.number().int().min(0).max(60),
  topics:       z.array(z.enum(TOPICS)).max(4).default([]),
  portfolioUrl: z.string().trim().url().max(500).or(z.literal("")).default(""),
  pitch:        z.string().trim().max(400).default(""),
})

export const loginSchema = z.object({
  email:    z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
})

export const updateProfileSchema = registerSchema
  .omit({ password: true, email: true })
  .partial()
  .extend({
    company:   z.string().trim().min(1).max(120).optional(),
    skills:    z.array(z.string().trim().min(1).max(60)).max(24).optional(),
    languages: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    openToWork: z.boolean().optional(),
  })

function searchBlobFor(u: { name: string; title: string; company: string; location: string; skills: string[]; topics: string[] }) {
  return buildSearchBlob([u.name, u.title, u.company, u.location, ...u.skills, ...u.topics])
}

import type { IUser } from "../../../interface/IUser.js"

type UserLike = Pick<IUser, "_id" | "slug" | "name" | "email" | "emailVerifiedAt" | "role" | "access" | "title" | "company" | "location" | "years" | "languages" | "topics" | "skills" | "openToWork" | "photoUrl" | "portfolioUrl" | "pitch" | "counts" | "createdAt">

/** Safe for any audience — no PII, no internal state. */
export function publicUser(user: UserLike) {
  return {
    id:           user._id.toString(),
    slug:         user.slug,
    name:         user.name,
    role:         user.role,
    title:        user.title,
    company:      user.company,
    location:     user.location,
    years:        user.years,
    languages:    user.languages ?? [],
    topics:       user.topics,
    skills:       user.skills,
    openToWork:   user.openToWork,
    photoUrl:     user.photoUrl,
    portfolioUrl: user.portfolioUrl,
    pitch:        user.pitch,
    counts:       { publishedWorks: user.counts.publishedWorks },
    createdAt:    user.createdAt,
  }
}

/** Owner-only — adds email, emailVerifiedAt, access level, and full quota counts. */
function ownerUser(user: UserLike) {
  return {
    ...publicUser(user),
    email:           user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    access:          user.access ?? "member",
    counts:          user.counts,
  }
}

export const AuthUsecase = {
  async Register(input: z.infer<typeof registerSchema>) {
    const existing = await User.findOne({ email: input.email }).lean()
    if (existing) throw conflict("An account with that email already exists.", { field: "email" })

    const slug = await uniqueSlug(input.name, async (candidate) =>
      Boolean(await User.exists({ slug: candidate })),
    )

    const passwordHash = await hashPassword(input.password)
    const token = signToken({ sub: slug, slug, role: input.role, access: "member" })

    const user = await User.create({
      slug,
      name:          input.name,
      email:         input.email,
      passwordHash,
      role:          input.role,
      title:         input.title,
      company:       "Independent",
      location:      input.location,
      years:         input.years,
      languages:     languagesFor(input.location),
      topics:        input.topics,
      skills:        [],
      openToWork:    true,
      photoUrl:      "",
      portfolioUrl:  input.portfolioUrl,
      pitch:         input.pitch,
      token,
      status:        "active",
      access:        "member",
      counts:        { publishedWorks: 0, topicUsage: {} },
      searchBlob:    "",
    })

    user.searchBlob = searchBlobFor({
      name: user.name, title: user.title, company: user.company,
      location: user.location, skills: user.skills, topics: user.topics as string[],
    })
    await user.save()

    return { user: ownerUser(user as unknown as UserLike), token }
  },

  async Login(input: z.infer<typeof loginSchema>) {
    const user = await User.findOne({ email: input.email, status: "active" })
    const ok = user?.passwordHash
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyPassword(input.password, "$2b$11$invalidhashpadding000000000000000000000000000000").then(() => false)

    if (!user || !ok) throw unauthorized("Email or password is incorrect.")

    const token = signToken({ sub: user._id.toString(), slug: user.slug, role: user.role as never, access: (user.access ?? "member") as never })
    user.token = token
    await user.save()

    return { user: ownerUser(user as unknown as UserLike), token }
  },

  async Logout(userId: string) {
    await User.updateOne({ _id: userId }, { $set: { token: null, updatedAt: new Date() } })
  },

  async Me(userId: string) {
    const user = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!user) throw notFound("Account")
    return ownerUser(user as unknown as UserLike)
  },

  async UpdateProfile(userId: string, patch: z.infer<typeof updateProfileSchema>) {
    const current = await User.findOne({ _id: userId, status: "active" }).lean()
    if (!current) throw notFound("Account")

    const next = { ...current, ...patch }
    const searchBlob = searchBlobFor({
      name:     (patch.name     ?? current.name)     as string,
      title:    (patch.title    ?? current.title)    as string,
      company:  (patch.company  ?? current.company)  as string,
      location: (patch.location ?? current.location) as string,
      skills:   (patch.skills   ?? current.skills)   as string[],
      topics:   (current.topics)                     as string[],
    })

    await User.updateOne({ _id: userId }, { $set: { ...patch, searchBlob, updatedAt: new Date() } })

    const cardChanged = patch.name !== undefined || patch.title !== undefined ||
      patch.role !== undefined || patch.company !== undefined ||
      patch.years !== undefined || patch.languages !== undefined
    if (cardChanged) {
      await Work.updateMany({ authorId: userId }, {
        $set: {
          "author.name":      next.name,
          "author.title":     patch.title    ?? current.title,
          "author.company":   patch.company  ?? current.company,
          "author.photoUrl":  current.photoUrl,
          "author.years":     patch.years    ?? current.years,
          "author.languages": patch.languages ?? current.languages ?? [],
          updatedAt:          new Date(),
        },
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
      { $set: { emailVerifyTokenHash: hashToken(token), emailVerifyExpiresAt: expiresAt, updatedAt: new Date() } },
    )
    return { alreadyVerified: false as const, token, expiresAt }
  },

  async ConfirmEmailVerification(token: string) {
    const user = await User.findOneAndUpdate(
      { emailVerifyTokenHash: hashToken(token), emailVerifyExpiresAt: { $gt: new Date() } },
      { $set: { emailVerifiedAt: new Date(), emailVerifyTokenHash: null, emailVerifyExpiresAt: null, updatedAt: new Date() } },
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
      { $set: { passwordResetTokenHash: hashToken(token), passwordResetExpiresAt: expiresAt, updatedAt: new Date() } },
    )
    return { token, user }
  },

  async ConfirmPasswordReset(token: string, password: string) {
    const user = await User.findOneAndUpdate(
      { passwordResetTokenHash: hashToken(token), passwordResetExpiresAt: { $gt: new Date() } },
      { $set: { passwordResetTokenHash: null, passwordResetExpiresAt: null, updatedAt: new Date() } },
      { new: true },
    )
    if (!user) throw badRequest("That reset link is invalid or has expired.")

    const passwordHash = await hashPassword(password)
    const newToken = signToken({
      sub: user._id.toString(), slug: user.slug,
      role: user.role as never, access: (user.access ?? "member") as never,
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
