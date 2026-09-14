import { z } from "zod"
import { ROLES, TOPICS } from "../../types.js"

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(200),
  location: z.string().trim().min(2).max(120),
  role: z.enum(ROLES),
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
    skills: z.array(z.string().trim().min(1).max(60)).max(24).optional(),
    openToWork: z.boolean().optional(),
  })
