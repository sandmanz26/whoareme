import { useEffect, useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { ChipGroup, Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field"
import { ArrowRight, Check } from "@/components/ui/Icon"
import { track } from "@/lib/analytics"
import { cn, initialsOf } from "@/lib/utils"
import {
  CATEGORY_OPTIONS,
  EMPTY_JOIN_VALUES,
  ROLE_OPTIONS,
  STEPS,
  validateStep,
  type JoinErrors,
  type JoinValues,
  type StepIndex,
} from "./joinForm"
import type { CategoryId, RoleId } from "@/data/taxonomy"
import { useAccount } from "@/hooks/useAccount"

const LAST_STEP: StepIndex = 2

interface JoinModalProps {
  open: boolean
  onClose: () => void
  /** Registration is only useful if it leads somewhere - straight to the panel. */
  onOpenPanel: () => void
}

export function JoinModal({ open, onClose, onOpenPanel }: JoinModalProps) {
  const { register } = useAccount()
  const [step, setStep] = useState<StepIndex>(0)
  const [values, setValues] = useState<JoinValues>(EMPTY_JOIN_VALUES)
  const [errors, setErrors] = useState<JoinErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [working, setWorking] = useState(false)

  // One counter per step reached, so the drop-off between them is visible.
  useEffect(() => {
    if (open) track("signup_opened")
  }, [open])
  useEffect(() => {
    if (!open) return
    if (step === 1) track("signup_step_2")
    if (step === 2) track("signup_step_3")
  }, [open, step])

  function update<K extends keyof JoinValues>(key: K, value: JoinValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    // Clear the field's error as soon as the person starts fixing it.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  function toggleCategory(id: CategoryId) {
    const next = values.categories.includes(id)
      ? values.categories.filter((category) => category !== id)
      : [...values.categories, id]
    update("categories", next)
  }

  async function goNext() {
    const found = validateStep(step, values)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    if (step === LAST_STEP) {
      // Front-end only: no request goes out, the account lands in localStorage.
      // Hashing is async, so the button is disabled while it runs - PBKDF2 at
      // 150k iterations is deliberately not instant.
      setWorking(true)
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        location: values.location.trim(),
        role: values.role as RoleId,
        title: values.title.trim(),
        years: values.years.trim(),
        topics: values.categories,
        portfolio: values.portfolio.trim(),
        pitch: values.pitch.trim(),
        // Added from the panel, not the join flow: three steps is already the
        // most a signup can ask before people give up.
        photo: "",
      }, values.password)
      setWorking(false)
      track("signup_completed")
      setSubmitted(true)
      return
    }
    setStep((current) => (current + 1) as StepIndex)
  }

  function reset() {
    setStep(0)
    setValues(EMPTY_JOIN_VALUES)
    setErrors({})
    setSubmitted(false)
  }

  function handleClose() {
    onClose()
    // Let the close animation finish before wiping the form.
    window.setTimeout(reset, 200)
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={submitted ? "You're on the list" : "Create your profile"}
      description={
        submitted
          ? "Nothing was sent anywhere - this demo keeps everything in your browser."
          : "Three short steps. You can edit all of it later."
      }
    >
      {submitted ? (
        <SuccessState
          values={values}
          onClose={handleClose}
          onOpenPanel={() => {
            onClose()
            onOpenPanel()
            window.setTimeout(reset, 200)
          }}
        />
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            goNext()
          }}
        >
          <Stepper current={step} />

          <div className="mt-7 flex flex-col gap-5">
            {step === 0 && <IdentityStep values={values} errors={errors} update={update} />}
            {step === 1 && (
              <CraftStep
                values={values}
                errors={errors}
                update={update}
                onToggleCategory={toggleCategory}
              />
            )}
            {step === 2 && <WorkStep values={values} errors={errors} update={update} />}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (step === 0 ? handleClose() : setStep((s) => (s - 1) as StepIndex))}
            >
              {step === 0 ? "Cancel" : "Back"}
            </Button>

            <Button type="submit" disabled={working}>
              {working
                ? "Creating your profile…"
                : step === LAST_STEP
                  ? "Publish profile"
                  : "Continue"}
              <ArrowRight size={17} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */

function Stepper({ current }: { current: StepIndex }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((stepInfo, index) => {
        const state = index === current ? "current" : index < current ? "done" : "todo"
        return (
          <li key={stepInfo.id} className="flex flex-1 flex-col gap-2">
            <span
              className={cn(
                "h-1 rounded-pill transition-colors duration-300",
                state === "todo" ? "bg-line" : "bg-ink",
              )}
            />
            <span
              className={cn(
                "font-display text-xs font-medium tracking-wide",
                state === "todo" ? "text-muted" : "text-ink",
              )}
              aria-current={state === "current" ? "step" : undefined}
            >
              {stepInfo.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

type StepProps = {
  values: JoinValues
  errors: JoinErrors
  update: <K extends keyof JoinValues>(key: K, value: JoinValues[K]) => void
}

function IdentityStep({ values, errors, update }: StepProps) {
  return (
    <>
      <Field label="Full name" required error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={values.name}
            autoComplete="name"
            placeholder="Rani Ardhana"
            onChange={(event) => update("name", event.target.value)}
          />
        )}
      </Field>

      <Field label="Email" required error={errors.email} hint="Only used to send you the edit link.">
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="email"
            aria-describedby={describedBy}
            invalid={invalid}
            value={values.email}
            autoComplete="email"
            placeholder="you@studio.com"
            onChange={(event) => update("email", event.target.value)}
          />
        )}
      </Field>

      <Field label="City & country" required error={errors.location}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={values.location}
            placeholder="Jakarta, ID"
            onChange={(event) => update("location", event.target.value)}
          />
        )}
      </Field>
    </>
  )
}

function CraftStep({
  values,
  errors,
  update,
  onToggleCategory,
}: StepProps & { onToggleCategory: (id: CategoryId) => void }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Craft" required error={errors.role}>
          {({ id, describedBy, invalid }) => (
            <SelectInput
              id={id}
              describedBy={describedBy}
              invalid={invalid}
              value={values.role}
              placeholder="Select a craft…"
              options={ROLE_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
              onChange={(next) => update("role", next as RoleId)}
            />
          )}
        </Field>

        <Field label="Years of experience" required error={errors.years}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="number"
              min={0}
              max={60}
              inputMode="numeric"
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.years}
              placeholder="7"
              onChange={(event) => update("years", event.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Current title" required error={errors.title}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={values.title}
            placeholder="Senior Product Designer"
            onChange={(event) => update("title", event.target.value)}
          />
        )}
      </Field>

      <ChipGroup
        legend="Categories"
        options={CATEGORY_OPTIONS}
        value={values.categories}
        onToggle={onToggleCategory}
        hint="Pick up to four worlds you have really shipped in."
        error={errors.categories}
      />
    </>
  )
}

function WorkStep({ values, errors, update }: StepProps) {
  return (
    <>
      <Field
        label="Portfolio or profile link"
        required
        error={errors.portfolio}
        hint="A site, GitHub, Dribbble, Behance - whatever shows the work best."
      >
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="url"
            aria-describedby={describedBy}
            invalid={invalid}
            value={values.portfolio}
            placeholder="https://"
            onChange={(event) => update("portfolio", event.target.value)}
          />
        )}
      </Field>

      <Field
        label="Password"
        required
        error={errors.password}
        hint="Guards the way back into this profile. Stored hashed, in this browser only."
      >
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="password"
            autoComplete="new-password"
            aria-describedby={describedBy}
            invalid={invalid}
            value={values.password}
            placeholder="At least 8 characters"
            onChange={(event) => update("password", event.target.value)}
          />
        )}
      </Field>

      <Field
        label="One line about your work"
        error={errors.pitch}
        hint="Optional. The sentence you would say out loud, not the one from LinkedIn."
      >
        {({ id, describedBy, invalid }) => (
          <TextArea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={values.pitch}
            rows={4}
            placeholder="I turn messy enterprise workflows into interfaces people don't dread."
            onChange={(event) => update("pitch", event.target.value)}
          />
        )}
      </Field>
    </>
  )
}

function SuccessState({
  values,
  onClose,
  onOpenPanel,
}: {
  values: JoinValues
  onClose: () => void
  onOpenPanel: () => void
}) {
  const categories = CATEGORY_OPTIONS.filter((option) => values.categories.includes(option.id))
  const role = ROLE_OPTIONS.find((option) => option.id === values.role)

  return (
    <div className="animate-fade-up flex flex-col items-center text-center">
      <span className="grid size-14 place-items-center rounded-pill bg-pop-lime text-ink">
        <Check size={26} />
      </span>

      <h3 className="display mt-5 text-2xl">Profile ready, {values.name.split(" ")[0]}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Here is how you will show up in the directory. Next: add real work - your panel has a
        different form for every craft.
      </p>

      {/* Preview card - mirrors the real directory card so the payoff is concrete. */}
      <div className="mt-7 w-full rounded-card border border-line bg-paper p-5 text-left">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-[30%] bg-ink font-display text-lg font-bold text-paper">
            {initialsOf(values.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-ink">{values.name}</p>
            <p className="truncate text-sm text-ink-2">{values.title}</p>
            <p className="mt-1 truncate text-xs text-muted">
              {values.location} · {values.years} yrs
            </p>
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {role && (
            <li className="rounded-pill border border-ink/20 bg-paper-2 px-2.5 py-1 font-display text-[0.6875rem] font-medium text-ink-2">
              {role.label}
            </li>
          )}
          {categories.map((category) => (
            <li
              key={category.id}
              className="rounded-pill border border-ink/10 bg-card px-2.5 py-1 font-display text-[0.6875rem] font-medium text-ink-2"
            >
              {category.label}
            </li>
          ))}
        </ul>

        {values.pitch.trim() && (
          <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-2">
            “{values.pitch.trim()}”
          </p>
        )}
      </div>

      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" onClick={onClose}>
          Later
        </Button>
        <Button onClick={onOpenPanel}>
          Open your panel
          <ArrowRight size={17} />
        </Button>
      </div>
    </div>
  )
}
