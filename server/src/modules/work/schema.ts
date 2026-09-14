import { z } from "zod"
import { BUSINESS_MODELS, ROLES, TOPICS } from "../../types.js"
import { paginationSchema } from "../../lib/pagination.js"

const csv = z
  .string()
  .optional()
  .transform((value) => (value ? value.split(",").map((v) => v.trim()).filter(Boolean) : []))

export const listWorkQuerySchema = paginationSchema.extend({
  role: z.enum(ROLES).optional(),
  topic: z.enum(TOPICS).optional(),
  model: z.enum(BUSINESS_MODELS).optional(),
  skills: csv.pipe(z.array(z.string().max(60)).max(8)),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(["recent", "title", "role", "popular"]).default("recent"),
})

const linkSchema = z.object({
  label: z.string().trim().max(60).default(""),
  href: z.string().trim().url().max(500),
})

const detailSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
  proof: z.boolean().default(false),
})

const sectionSchema = z.object({
  heading: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2000),
})

/**
 * One schema for both authoring modes, refined per mode. A template entry owes
 * problem/approach/outcome; a custom entry owes at least one section. Neither
 * is optional at publish time — see `publishableSchema`.
 */
export const workInputSchema = z
  .object({
    mode: z.enum(["template", "custom"]),
    role: z.enum(ROLES),
    topics: z.array(z.enum(TOPICS)).max(4).default([]),
    model: z.enum(BUSINESS_MODELS).nullable().default(null),
    skills: z.array(z.string().trim().min(1).max(60)).max(8).default([]),

    title: z.string().trim().min(1).max(90),
    summary: z.string().trim().max(140).default(""),
    year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
    duration: z.string().trim().max(60).default(""),
    scope: z.string().trim().max(160).default(""),

    problem: z.string().trim().max(500).default(""),
    approach: z.string().trim().max(500).default(""),
    outcome: z.string().trim().max(500).default(""),

    sections: z.array(sectionSchema).max(10).default([]),
    details: z.array(detailSchema).max(12).default([]),
    links: z.array(linkSchema).max(8).default([]),
    stack: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  })
  .refine((v) => v.mode !== "custom" || v.sections.length > 0 || v.title.length > 0, {
    message: "A custom entry needs at least one section.",
    path: ["sections"],
  })

export type WorkInput = z.infer<typeof workInputSchema>

/** The extra bar an entry has to clear to leave draft. */
export const publishableSchema = workInputSchema.superRefine((v, ctx) => {
  const require = (cond: boolean, path: string, message: string) => {
    if (!cond) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
  }

  require(v.topics.length > 0, "topics", "Pick at least one topic so people can find it.")
  require(v.skills.length > 0, "skills", "Add at least one skill — the filters use these.")
  require(Boolean(v.model), "model", "Business model is required.")
  require(v.summary.trim().length > 0, "summary", "A one-line summary is required.")

  if (v.mode === "template") {
    require(v.problem.trim().length > 0, "problem", "Describe the problem.")
    require(v.approach.trim().length > 0, "approach", "Describe what you did.")
    require(v.outcome.trim().length > 0, "outcome", "Describe what changed.")
  } else {
    require(v.sections.length > 0, "sections", "Write at least one section.")
    require(
      v.details.some((d) => d.proof),
      "details",
      "Add at least one result — it becomes the number on your card.",
    )
  }
})

export const slugParamSchema = z.object({ slug: z.string().trim().min(1).max(120) })
export const idParamSchema = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id.") })
