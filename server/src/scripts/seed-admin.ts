import mongoose from "mongoose"
import { env } from "../config/index.js"
import { ROLES, type RoleId } from "../constant/app.js"
import User from "../models/user.js"
import { hashPassword } from "../service/password.js"
import { uniqueSlug } from "../utils/slug.js"
import { buildSearchBlob } from "../utils/text.js"

const DEFAULTS = {
  name: "Admin",
  email: "admin@whoareyou.directory",
  password: "Admin!2345",
  title: "Platform admin",
  company: "whoareyou",
  location: "Remote",
  role: "product",
}

interface AdminInput {
  name: string
  email: string
  password: string
  title: string
  company: string
  location: string
  role: string
}

function readInput(): AdminInput {
  const env_ = process.env
  const input: AdminInput = {
    name: env_.ADMIN_NAME || DEFAULTS.name,
    email: (env_.ADMIN_EMAIL || DEFAULTS.email).trim().toLowerCase(),
    password: env_.ADMIN_PASSWORD || DEFAULTS.password,
    title: env_.ADMIN_TITLE || DEFAULTS.title,
    company: env_.ADMIN_COMPANY || DEFAULTS.company,
    location: env_.ADMIN_LOCATION || DEFAULTS.location,
    role: env_.ADMIN_ROLE || DEFAULTS.role,
  }
  if (input.password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.")
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error("ADMIN_EMAIL is not a valid email address.")
  }
  if (!ROLES.includes(input.role as RoleId)) {
    throw new Error(`ADMIN_ROLE must be one of: ${ROLES.join(", ")}`)
  }
  return input
}

async function main() {
  const input = readInput()

  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB })
  console.log(`Connected to ${env.MONGODB_DB}`)

  const now = new Date()
  const existing = await User.findOne({ email: input.email }).lean()

  if (existing) {
    const passwordHash = await hashPassword(input.password)
    await User.updateOne(
      { _id: existing._id },
      {
        $set: {
          passwordHash,
          access: "admin",
          status: "active",
          emailVerifiedAt: existing.emailVerifiedAt ?? now,
          updatedAt: now,
        },
      },
    )
    console.log(`Updated existing user ${input.email} → access=admin, password reset`)
    console.log(`  slug: ${existing.slug}`)
  } else {
    const slug = await uniqueSlug(input.name, async (candidate) =>
      Boolean(await User.exists({ slug: candidate })),
    )
    const passwordHash = await hashPassword(input.password)
    const searchBlob = buildSearchBlob([
      input.name,
      input.title,
      input.company,
      input.location,
    ])

    await User.create({
      slug,
      name: input.name,
      email: input.email,
      passwordHash,
      emailVerifiedAt: now,
      role: input.role as RoleId,
      title: input.title,
      company: input.company,
      location: input.location,
      years: 0,
      languages: [],
      topics: [],
      skills: [],
      openToWork: false,
      photoUrl: "",
      portfolioUrl: "",
      pitch: "",
      token: null,
      seeded: true,
      status: "active",
      access: "admin",
      counts: { publishedWorks: 0, topicUsage: {} },
      searchBlob,
      createdAt: now,
      updatedAt: now,
    })
    console.log(`Created admin user ${input.email}`)
    console.log(`  slug: ${slug}`)
  }

  console.log("")
  console.log("Credentials:")
  console.log(`  email:    ${input.email}`)
  console.log(`  password: ${input.password}`)
  console.log("")
  console.log("Rotate the password after first login.")

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})