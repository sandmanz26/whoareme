import { useState } from "react"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"
import { Field, TextInput } from "@/components/ui/Field"
import { ArrowRight, Check } from "@/components/ui/Icon"
import { useAccount } from "@/hooks/useAccount"
import { passwordProblem } from "@/lib/password"
import { navigate, type Route } from "@/lib/router"

interface SignInPageProps {
  route: Route
  onSignUp: () => void
}

/**
 * Sign in, and the reset beside it.
 *
 * Both live on one page because they share every field and half the copy, and
 * because "forgot password" that navigates somewhere else loses the email the
 * person already typed.
 *
 * The honesty notice is not decoration. This build has no server: the hash
 * lives in `localStorage`, anyone with dev tools can edit it, and a reset
 * sends no mail. Saying that plainly is better than a login screen that
 * implies a security boundary it does not have.
 */
export function SignInPage({ route, onSignUp }: SignInPageProps) {
  const { signIn, resetPassword, hasStoredAccount, storedEmail } = useAccount()
  const mode = route.segments[0] === "reset" ? "reset" : "signin"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (mode === "reset") {
      const problem = passwordProblem(password)
      if (problem) return setError(problem)
      if (password !== confirm) return setError("The two passwords do not match.")
    }

    setWorking(true)
    const result =
      mode === "reset" ? await resetPassword(email, password) : await signIn(email, password)
    setWorking(false)

    if (!result.ok) return setError(result.reason)
    navigate("/panel")
  }

  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-16">
      <h1 className="display text-[clamp(1.875rem,5vw,2.75rem)]">
        {mode === "reset" ? "Set a new password" : "Sign in"}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        {mode === "reset"
          ? "Confirm the email on the profile in this browser, then choose a new password."
          : "Back to your panel, your entries and your traffic."}
      </p>

      {!hasStoredAccount ? (
        <div className="mt-8 rounded-card border border-dashed border-ink/25 p-6">
          <p className="font-display text-base font-semibold text-ink">
            No profile in this browser
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Profiles are stored per browser in this build, so there is nothing here to sign in to
            yet. Creating one takes three steps.
          </p>
          <Button className="mt-5" onClick={onSignUp}>
            Sign up
            <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <form className="mt-8 flex flex-col gap-5" onSubmit={submit}>
          <Field label="Email" required hint={storedEmail ? `This browser holds ${storedEmail}.` : undefined}>
            {({ id, invalid }) => (
              <TextInput
                id={id}
                type="email"
                autoComplete="username"
                invalid={invalid}
                value={email}
                placeholder="you@studio.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
          </Field>

          <Field label={mode === "reset" ? "New password" : "Password"} required>
            {({ id, invalid }) => (
              <TextInput
                id={id}
                type="password"
                autoComplete={mode === "reset" ? "new-password" : "current-password"}
                invalid={invalid}
                value={password}
                placeholder={mode === "reset" ? "At least 8 characters" : ""}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>

          {mode === "reset" && (
            <Field label="Repeat the new password" required>
              {({ id, invalid }) => (
                <TextInput
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  invalid={invalid}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              )}
            </Field>
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-pop-pink">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={working}>
              {working ? "Checking…" : mode === "reset" ? "Set password and sign in" : "Sign in"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setError(null)
                setPassword("")
                setConfirm("")
                navigate(mode === "reset" ? "/signin" : "/reset")
              }}
              className="cursor-pointer font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
            >
              {mode === "reset" ? "Back to sign in" : "Forgot your password?"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-10 rounded-card border border-line bg-paper-2/60 p-5">
        <p className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
          <Check size={15} className="text-pop-violet" />
          What this actually does
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          There is no server in this build. Your profile and a PBKDF2 hash of your password are
          stored in this browser, so a reset sends no email and anyone who can open dev tools can
          edit the record. Treat this as the flow, not the boundary. The API in{" "}
          <code>/server</code> is where real authentication lives: scrypt hashes, rotating refresh
          tokens, and sessions the database can expire.
        </p>
      </div>

      {hasStoredAccount && (
        <p className="mt-6 text-sm text-muted">
          Want a different profile?{" "}
          <button
            type="button"
            onClick={onSignUp}
            className="cursor-pointer font-display font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
          >
            Sign up
          </button>{" "}
          replaces the one in this browser.
        </p>
      )}
    </Container>
  )
}
