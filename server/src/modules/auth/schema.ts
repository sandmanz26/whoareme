import { z } from "zod"
import { isRoleLive, ROLES, TOPICS } from "../../types.js"

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(200),
  location: z.string().trim().min(2).max(120),
  /**
   * Only a craft that is live may be registered into. The SPA offers exactly
   * these four in the signup form; refusing the rest here means a hand-rolled
   * request cannot put someone into a craft the directory does not yet show,
   * where their work would be invisible and they would have no way to know it.
   */
  role: z.enum(ROLES).refine(isRoleLive, {
    message: "That craft is not open yet. Pick one of the live ones.",
  }),
  title: z.string().trim().min(2).max(120),
  years: z.coerce.number().int().min(0).max(60),
  topics: z.array(z.enum(TOPICS)).min(1).max(4),
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
    // Set to "Independent" on register, editable afterwards. It is on every
    // card, so a profile edit that could not change it left the one field
    // people most often get wrong permanently wrong.
    company: z.string().trim().min(1).max(120).optional(),
    skills: z.array(z.string().trim().min(1).max(60)).max(24).optional(),
    // Seeded from the country on register; editable afterwards, because the
    // country someone works in does not decide what they speak.
    languages: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    openToWork: z.boolean().optional(),
  })
