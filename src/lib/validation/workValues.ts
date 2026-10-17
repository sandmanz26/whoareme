import { z } from "zod"
import type { FieldSpec } from "@/data/portfolioSchemas"

const URL_LIKE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#][^\s]*)?$/
const CURRENT_YEAR = new Date().getFullYear()

/** One Zod field per spec, keeping the same messages the form already used. */
function fieldSchema(spec: FieldSpec) {
  // Untouched inputs are absent from the form values, so normalise anything that
  // is not a string to "" before the checks. Without this, an optional field the
  // author never touched fails as "expected string, received undefined".
  return z.preprocess(
    (raw) => (typeof raw === "string" ? raw : ""),
    z.string().superRefine((raw, ctx) => {
      const value = raw.trim()

      if (spec.required && !value) {
        ctx.addIssue({ code: "custom", message: `${spec.label} is required.` })
        return
      }
      if (!value) return

      if (spec.kind === "url" && !URL_LIKE.test(value)) {
        ctx.addIssue({ code: "custom", message: "That does not look like a URL." })
      }

      if (spec.kind === "number") {
        const parsed = Number(value)
        if (!Number.isFinite(parsed)) {
          ctx.addIssue({ code: "custom", message: "Enter a number." })
        } else if (parsed < 1980 || parsed > CURRENT_YEAR + 1) {
          ctx.addIssue({ code: "custom", message: "Enter a realistic year." })
        }
      }

      if (spec.maxLength && value.length > spec.maxLength) {
        ctx.addIssue({ code: "custom", message: `Keep it under ${spec.maxLength} characters.` })
      }
    }),
  )
}

/** The flat values bag validated against whichever field specs are active. */
export function workValuesSchema(specs: FieldSpec[]) {
  return z.object(Object.fromEntries(specs.map((spec) => [spec.name, fieldSchema(spec)])))
}

export type WorkValues = Record<string, string>
