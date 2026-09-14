import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { ChevronDown } from "./Icon"
import { cn } from "@/lib/utils"

const CONTROL =
  "w-full rounded-2xl border bg-card px-4 py-3 text-sm text-ink placeholder:text-muted/70 " +
  "transition-colors duration-200 focus:border-ink focus:outline-none"

interface FieldShellProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

/**
 * One layout for every control: visible label (never placeholder-only),
 * helper text, and an inline error wired up through aria-describedby.
 */
export function Field({ label, hint, error, required, children }: FieldShellProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-display text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-1 text-pop-pink">*</span>}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-pop-pink">
          {error}
        </p>
      )}
    </div>
  )
}

type ControlState = { invalid: boolean }

export function TextInput({
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & ControlState) {
  return (
    <input
      className={cn(CONTROL, invalid ? "border-pop-pink" : "border-line", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

export function TextArea({
  invalid,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & ControlState) {
  return (
    <textarea
      rows={3}
      className={cn(CONTROL, "resize-y", invalid ? "border-pop-pink" : "border-line", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

export function SelectInput({
  invalid,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & ControlState) {
  return (
    <div className="relative">
      <select
        className={cn(
          CONTROL,
          "cursor-pointer appearance-none pr-10",
          invalid ? "border-pop-pink" : "border-line",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
      />
    </div>
  )
}

/** Multi-select rendered as toggle chips - faster to scan than a listbox. */
export function ChipGroup<T extends string>({
  options,
  value,
  onToggle,
  legend,
  hint,
  error,
}: {
  options: ReadonlyArray<{ id: T; label: string }>
  value: readonly T[]
  onToggle: (id: T) => void
  legend: string
  hint?: string
  error?: string
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-display text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(option.id)}
              className={cn(
                "cursor-pointer rounded-pill border px-4 py-2.5 font-display text-sm font-medium",
                "transition-all duration-200 ease-pop active:scale-[0.97]",
                selected
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-card text-ink-2 hover:border-ink/40",
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-pop-pink">
          {error}
        </p>
      )}
    </fieldset>
  )
}
