import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field"
import type { FieldSpec } from "@/data/portfolioSchemas"

const URL_LIKE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#][^\s]*)?$/

export type FieldErrors = Record<string, string>

/**
 * One renderer for every craft. The portfolio form differs per role because
 * the evidence differs per role - but the rendering, validation and error
 * plumbing are identical, so adding a field to a schema is a one-line change.
 */
export function validateFields(specs: FieldSpec[], values: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {}

  for (const spec of specs) {
    const value = (values[spec.name] ?? "").trim()

    if (spec.required && !value) {
      errors[spec.name] = `${spec.label} is required.`
      continue
    }
    if (!value) continue

    if (spec.kind === "url" && !URL_LIKE.test(value)) {
      errors[spec.name] = "That does not look like a URL."
    }
    if (spec.kind === "number") {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) errors[spec.name] = "Enter a number."
      else if (parsed < 1980 || parsed > new Date().getFullYear() + 1)
        errors[spec.name] = "Enter a realistic year."
    }
    if (spec.maxLength && value.length > spec.maxLength) {
      errors[spec.name] = `Keep it under ${spec.maxLength} characters.`
    }
  }

  return errors
}

interface SchemaFieldProps {
  spec: FieldSpec
  value: string
  error?: string
  onChange: (name: string, value: string) => void
}

export function SchemaField({ spec, value, error, onChange }: SchemaFieldProps) {
  const remaining = spec.maxLength ? spec.maxLength - value.length : null
  const hint =
    spec.hint ??
    (spec.kind === "tags" ? "Comma separated." : undefined) ??
    (remaining !== null && remaining <= 20 ? `${remaining} characters left` : undefined)

  return (
    <Field label={spec.label} hint={hint} error={error} required={spec.required}>
      {({ id, describedBy, invalid }) =>
        spec.kind === "select" ? (
          <SelectInput
            id={id}
            describedBy={describedBy}
            invalid={invalid}
            value={value}
            placeholder="Select…"
            options={spec.options ?? []}
            onChange={(next) => onChange(spec.name, next)}
          />
        ) : spec.kind === "textarea" ? (
          <TextArea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            rows={4}
            value={value}
            placeholder={spec.placeholder}
            onChange={(event) => onChange(spec.name, event.target.value)}
          />
        ) : (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type={spec.kind === "number" ? "number" : spec.kind === "url" ? "url" : "text"}
            inputMode={spec.kind === "number" ? "numeric" : undefined}
            value={value}
            placeholder={spec.placeholder}
            onChange={(event) => onChange(spec.name, event.target.value)}
          />
        )
      }
    </Field>
  )
}
