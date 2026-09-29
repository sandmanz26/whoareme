import { useEffect, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"
import { Field, PasswordInput, TextInput } from "@/components/ui/Field"
import { useAccount } from "@/hooks/useAccount"
import { passwordProblem } from "@/lib/password"
import { applyMeta } from "@/lib/head"
import { api } from "@/lib/api/client"

type Mode = "signin" | "request" | "confirm"

export function SignInPage() {
  const { pathname }  = useLocation()
  const [params]      = useSearchParams()
  const navigate      = useNavigate()
  const { signIn, confirmPasswordReset } = useAccount()

  const resetToken = params.get("token")
  const mode: Mode = pathname.startsWith("/reset")
    ? (resetToken ? "confirm" : "request")
    : "signin"

  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [error,    setError]    = useState<string | null>(null)
  const [working,  setWorking]  = useState(false)
  const [sent,     setSent]     = useState(false)

  useEffect(() => {
    if (mode === "confirm") {
      return applyMeta({ title: "Set a new password", noindex: true })
    }
    if (mode === "request") {
      return applyMeta({ title: "Forgot your password?", noindex: true })
    }
    return applyMeta({
      title: "Sign in",
      description: "Back to your panel, your entries and your traffic.",
      noindex: true,
    })
  }, [mode])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (mode === "confirm") {
      const problem = passwordProblem(password)
      if (problem) return setError(problem)
      if (password !== confirm) return setError("The two passwords do not match.")
      setWorking(true)
      const result = await confirmPasswordReset(resetToken!, password)
      setWorking(false)
      if (!result.ok) return setError(result.reason)
      navigate("/panel")
      return
    }

    if (mode === "request") {
      setWorking(true)
      try {
        await api.post("/user/auth/forgot-password", { email })
        setSent(true)
      } catch {
        setError("Could not send reset link — try again.")
      } finally {
        setWorking(false)
      }
      return
    }

    // signin
    setWorking(true)
    const result = await signIn(email, password)
    setWorking(false)
    if (!result.ok) return setError(result.reason)
    navigate("/panel")
  }

  const heading = mode === "confirm"
    ? "Set a new password"
    : mode === "request"
      ? "Forgot your password?"
      : "Sign in"

  const subtext = mode === "confirm"
    ? "Choose a new password for your account."
    : mode === "request"
      ? "Enter your email and we'll send a reset link."
      : "Back to your panel, your entries and your traffic."

  if (mode === "request" && sent) {
    return (
      <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-16">
        <h1 className="display text-[clamp(1.875rem,5vw,2.75rem)]">Check your inbox</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          We sent a reset link to <strong>{email}</strong>. It expires in 1 hour.
        </p>
        <button
          type="button"
          onClick={() => navigate("/signin")}
          className="mt-8 cursor-pointer self-start font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
        >
          Back to sign in
        </button>
      </Container>
    )
  }

  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-16">
      <h1 className="display text-[clamp(1.875rem,5vw,2.75rem)]">{heading}</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">{subtext}</p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={submit}>
        {mode !== "confirm" && (
          <Field label="Email" required>
            {({ id, invalid }) => (
              <TextInput
                id={id}
                type="email"
                autoComplete="username"
                invalid={invalid}
                value={email}
                placeholder="you@studio.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
        )}

        {mode !== "request" && (
          <Field label={mode === "confirm" ? "New password" : "Password"} required>
            {({ id, invalid }) => (
              <PasswordInput
                id={id}
                autoComplete={mode === "confirm" ? "new-password" : "current-password"}
                invalid={invalid}
                value={password}
                placeholder={mode === "confirm" ? "At least 8 characters" : ""}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
        )}

        {mode === "confirm" && (
          <Field label="Repeat new password" required>
            {({ id, invalid }) => (
              <PasswordInput
                id={id}
                autoComplete="new-password"
                invalid={invalid}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
            {working
              ? "Working…"
              : mode === "confirm"
                ? "Set password and sign in"
                : mode === "request"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setError(null)
              setPassword("")
              setConfirm("")
              navigate(mode === "signin" ? "/reset" : "/signin")
            }}
            className="cursor-pointer font-display text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
          >
            {mode === "signin" ? "Forgot your password?" : "Back to sign in"}
          </button>
        </div>
      </form>
    </Container>
  )
}
