import { z } from "zod"
import { LIVE_ROLES } from "@/data/taxonomy"

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email({ error: "Not a valid email address" }),
  password: z.string().min(1, "Password is required"),
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email({ error: "Not a valid email address" }),
})

// Matches server constraint (min 10). Frontend previously allowed 8 — aligned here.
export const resetPasswordSchema = z
  .object({
    password: z.string().min(10, "At least 10 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  })

export const registerSchema = z.object({
  name: z.string().trim().min(1, "We need a name to put on the profile"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email({ error: "That email does not look right" }),
  role: z
    .string()
    .refine(
      (r) => LIVE_ROLES.some((role) => role.id === r),
      "Pick the craft you want to be found for",
    ),
  password: z.string().min(10, "At least 10 characters"),
})

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().optional(),
  location: z.string().optional(),
  years: z.string().optional(),
  role: z.string().optional(),
  title: z.string().optional(),
  topics: z.array(z.string()).max(4).optional(),
  portfolio: z.string().optional(),
  pitch: z.string().optional(),
  photo: z.string().optional(),
})

export type LoginValues = z.infer<typeof loginSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type UpdateProfileValues = z.infer<typeof updateProfileSchema>
