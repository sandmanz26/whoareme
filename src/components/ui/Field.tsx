import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react"
import { Combobox, type ComboOption } from "./Combobox"
import { Eye, EyeOff } from "./Icon"
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

export function PasswordInput({
  invalid,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & ControlState) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={cn(CONTROL, "pr-11", invalid ? "border-pop-pink" : "border-line", className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted transition-colors hover:text-ink"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
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

/**
 * The form's dropdown. Same component as the filter bar's, so a list long
 * enough to need typing at gets a filter in both places rather than only
 * where someone remembered to add one.
 */
export function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
  describedBy,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: ReadonlyArray<ComboOption>
  placeholder: string
  invalid: boolean
  describedBy?: string
}) {
  return (
    <Combobox
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      emptyLabel={placeholder}
      invalid={invalid}
      describedBy={describedBy}
      className={cn(
        "rounded-2xl border bg-card px-4 py-3 text-sm",
        invalid ? "border-pop-pink" : "border-line",
      )}
    />
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
  max,
}: {
  options: ReadonlyArray<{ id: T; label: string }>
  value: readonly T[]
  onToggle: (id: T) => void
  legend: string
  hint?: string
  error?: string
  max?: number
}) {
  const atMax = max !== undefined && value.length >= max

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-display text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option.id)
          const disabled = atMax && !selected
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onToggle(option.id)}
              className={cn(
                "rounded-pill border px-4 py-2.5 font-display text-sm font-medium",
                "transition-all duration-200 ease-pop",
                selected
                  ? "cursor-pointer border-ink bg-ink text-paper active:scale-[0.97]"
                  : disabled
                    ? "cursor-not-allowed border-line bg-card text-muted opacity-40"
                    : "cursor-pointer border-line bg-card text-ink-2 hover:border-ink/40 active:scale-[0.97]",
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
