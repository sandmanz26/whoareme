import { useEffect, useState } from "react"
import axios from "axios"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Field, PasswordInput, SelectInput, TextInput } from "@/components/ui/Field"
import { ArrowRight, Check } from "@/components/ui/Icon"
import { track } from "@/lib/analytics"
import { initialsOf } from "@/lib/utils"
import {
  EMPTY_JOIN_VALUES,
  ROLE_OPTIONS,
  validateJoin,
  type JoinErrors,
  type JoinValues,
} from "./joinForm"
import type { RoleId } from "@/data/taxonomy"
import { useAccount } from "@/hooks/useAccount"

interface JoinModalProps {
  open: boolean
  onClose: () => void
  /** Registration is only useful if it leads somewhere - straight to the panel. */
  onOpenPanel: () => void
}

/**
 * One screen: name, email, craft, password. Everything else a profile can
 * carry - location, title, topics, a portfolio link, a bio, a photo - is a
 * field on the panel's profile form, not a step here. A shorter form finishes
 * more often, and finishing is worth more than arriving complete.
 */
export function JoinModal({ open, onClose, onOpenPanel }: JoinModalProps) {
  const { register } = useAccount()
  const [values, setValues] = useState<JoinValues>(EMPTY_JOIN_VALUES)
  const [errors, setErrors] = useState<JoinErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (open) track("signup_opened")
  }, [open])

  function update<K extends keyof JoinValues>(key: K, value: JoinValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
    setServerError(null)
  }

  async function submit() {
    const found = validateJoin(values)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }

    // Front-end only: no request goes out, the account lands in localStorage.
    // Hashing is async, so the button is disabled while it runs - PBKDF2 at
    // 150k iterations is deliberately not instant.
    setWorking(true)
    try {
      await register(
        {
          name: values.name.trim(),
          email: values.email.trim(),
          role: values.role as RoleId,
          // Filled in from the panel, not here.
          location: "",
          title: "",
          years: "",
          topics: [],
          portfolio: "",
          pitch: "",
          photo: "",
        },
        values.password,
      )
      track("signup_completed")
      setSubmitted(true)
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? "Something went wrong."
        : "Something went wrong. Please try again."
      setServerError(msg)
    } finally {
      setWorking(false)
    }
  }

  function reset() {
    setValues(EMPTY_JOIN_VALUES)
    setErrors({})
    setServerError(null)
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
          : "Who you are, how to get back in, and what you do. The rest - title, location, a portfolio link, a bio - is a field on your panel whenever you're ready."
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
            submit()
          }}
        >
          <div className="flex flex-col gap-5">
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

            <Field label="Craft" required error={errors.role} hint="What you want to be found for.">
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

            <Field
              label="Password"
              required
              error={errors.password}
              hint="Guards the way back into this profile. Stored hashed, in this browser only."
            >
              {({ id, describedBy, invalid }) => (
                <PasswordInput
                  id={id}
                  autoComplete="new-password"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={values.password}
                  placeholder="At least 8 characters"
                  onChange={(event) => update("password", event.target.value)}
                />
              )}
            </Field>
          </div>

          {serverError && (
            <p role="alert" className="text-sm font-medium text-pop-pink">
              {serverError}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>

            <Button type="submit" disabled={working}>
              {working ? "Creating your profile…" : "Create profile"}
              <ArrowRight size={17} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */

function SuccessState({
  values,
  onClose,
  onOpenPanel,
}: {
  values: JoinValues
  onClose: () => void
  onOpenPanel: () => void
}) {
  const role = ROLE_OPTIONS.find((option) => option.id === values.role)

  return (
    <div className="animate-fade-up flex flex-col items-center text-center">
      <span className="grid size-14 place-items-center rounded-pill bg-pop-lime text-ink">
        <Check size={26} />
      </span>

      <h3 className="display mt-5 text-2xl">Profile ready, {values.name.split(" ")[0]}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Add your title, location, a portfolio link and a bio from your panel - then add real work.
        Your panel has a different form for every craft.
      </p>

      {/* Preview card - mirrors the real directory card so the payoff is concrete. */}
      <div className="mt-7 w-full rounded-card border border-line bg-paper p-5 text-left">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-[30%] bg-ink font-display text-lg font-bold text-paper">
            {initialsOf(values.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-ink">{values.name}</p>
            <p className="truncate text-sm text-ink-2">Add your title</p>
          </div>
        </div>

        {role && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            <li className="rounded-pill border border-ink/20 bg-paper-2 px-2.5 py-1 font-display text-[0.6875rem] font-medium text-ink-2">
              {role.label}
            </li>
          </ul>
        )}
      </div>

      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" onClick={onClose}>
          Later
        </Button>
        <Button onClick={onOpenPanel}>
          Finish your profile
          <ArrowRight size={17} />
        </Button>
      </div>
    </div>
  )
}
