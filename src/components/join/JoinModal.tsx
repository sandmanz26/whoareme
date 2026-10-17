import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Field, PasswordInput, SelectInput, TextInput } from "@/components/ui/Field"
import { ArrowRight, Check } from "@/components/ui/Icon"
import { track } from "@/lib/analytics"
import { ROLE_OPTIONS } from "./joinForm"
import type { RoleId } from "@/data/taxonomy"
import { useAccount } from "@/hooks/useAccount"
import { registerSchema, type RegisterValues } from "@/lib/validation/authSchemas"

interface JoinModalProps {
  open: boolean
  onClose: () => void
}

export function JoinModal({ open, onClose }: JoinModalProps) {
  const { register: registerAccount } = useAccount()
  const navigate = useNavigate()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", role: "", password: "" },
  })
  const {
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = form
  const values = form.watch()

  useEffect(() => {
    if (open) track("signup_opened")
  }, [open])

  async function onSubmit(data: RegisterValues) {
    try {
      await registerAccount(
        {
          name: data.name.trim(),
          email: data.email.trim(),
          role: data.role as RoleId,
          location: "",
          title: "",
          years: "",
          topics: [],
          portfolio: "",
          pitch: "",
          photo: "",
        },
        data.password,
      )
      track("signup_completed")
    } catch (err) {
      const msg = isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? "Something went wrong.")
        : "Something went wrong. Please try again."
      form.setError("root", { message: msg })
      throw err // re-throw so RHF marks isSubmitSuccessful as false
    }
  }

  function handleClose() {
    onClose()
    window.setTimeout(() => form.reset(), 200)
  }

  const serverError = form.formState.errors.root?.message

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isSubmitSuccessful ? "Check your inbox" : "Create your profile"}
      description={
        isSubmitSuccessful
          ? `We sent a sign-up link to ${values.email}. Confirm it, then sign in.`
          : "Who you are, how to get back in, and what you do. The rest - title, location, a portfolio link, a bio - is a field on your panel whenever you're ready."
      }
    >
      {isSubmitSuccessful ? (
        <SuccessState
          values={values}
          onClose={handleClose}
          onSignIn={() => {
            handleClose()
            navigate("/signin")
          }}
        />
      ) : (
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit, () => {
            // validation error - no-op, RHF shows inline errors
          })}
        >
          <div className="flex flex-col gap-5">
            <Field label="Full name" required error={errors.name?.message}>
              {({ id, describedBy, invalid }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={values.name}
                  autoComplete="name"
                  placeholder="Rani Ardhana"
                  onChange={(e) =>
                    form.setValue("name", e.target.value, {
                      shouldValidate: isSubmitting,
                    })
                  }
                />
              )}
            </Field>

            <Field
              label="Email"
              required
              error={errors.email?.message}
              hint="Only used to send you the edit link."
            >
              {({ id, describedBy, invalid }) => (
                <TextInput
                  id={id}
                  type="email"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={values.email}
                  autoComplete="email"
                  placeholder="you@studio.com"
                  onChange={(e) =>
                    form.setValue("email", e.target.value, {
                      shouldValidate: isSubmitting,
                    })
                  }
                />
              )}
            </Field>

            <Field
              label="Craft"
              required
              error={errors.role?.message}
              hint="What you want to be found for."
            >
              {({ id, describedBy, invalid }) => (
                <SelectInput
                  id={id}
                  describedBy={describedBy}
                  invalid={invalid}
                  value={values.role}
                  placeholder="Select a craft…"
                  options={ROLE_OPTIONS.map((o) => ({
                    value: o.id,
                    label: o.label,
                  }))}
                  onChange={(next) => form.setValue("role", next, { shouldValidate: true })}
                />
              )}
            </Field>

            <Field
              label="Password"
              required
              error={errors.password?.message}
              hint="Guards the way back into this profile. Stored hashed, on our servers."
            >
              {({ id, describedBy, invalid }) => (
                <PasswordInput
                  id={id}
                  autoComplete="new-password"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={values.password}
                  placeholder="At least 10 characters"
                  onChange={(e) =>
                    form.setValue("password", e.target.value, {
                      shouldValidate: isSubmitting,
                    })
                  }
                />
              )}
            </Field>
          </div>

          {serverError && (
            <p role="alert" className="mt-4 text-sm font-medium text-pop-pink">
              {serverError}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating your profile…" : "Create profile"}
              <ArrowRight size={17} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ── Success state ────────────────────────────────────────────────────── */

function SuccessState({
  values,
  onClose,
  onSignIn,
}: {
  values: RegisterValues
  onClose: () => void
  onSignIn: () => void
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center text-center">
      <span className="grid size-14 place-items-center rounded-pill bg-pop-lime text-ink">
        <Check size={26} />
      </span>

      <h3 className="display mt-5 text-2xl">Check your inbox</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        We sent a link to <strong className="text-ink">{values.email}</strong>. Open it to confirm
        the address, then sign in. If that address already had an account, the email explains how
        to get back in instead.
      </p>

      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onSignIn}>
          Sign in
          <ArrowRight size={17} />
        </Button>
      </div>
    </div>
  )
}
