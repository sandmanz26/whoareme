import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from "axios"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"
import { Check } from "@/components/ui/Icon"
import { applyMeta } from "@/lib/head"
import { api } from "@/lib/api/client"
import { useAccount } from "@/hooks/useAccount"

type State = "loading" | "success" | "error"

export function VerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refreshAccount } = useAccount()
  const [state, setState] = useState<State>("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const cleanup = applyMeta({ title: "Verify email", noindex: true })

    const token = params.get("token")
    if (!token) {
      setState("error")
      setErrorMsg("No verification token found in the URL.")
      return cleanup
    }

    api
      .post("/user/auth/verify/confirm", { token })
      .then(async () => {
        try {
          await refreshAccount()
        } catch {
          /* user may not be signed in — ok */
        }
        setState("success")
        setTimeout(() => navigate("/panel"), 3000)
      })
      .catch((err: unknown) => {
        const msg = axios.isAxiosError(err)
          ? ((err.response?.data as { message?: string })?.message ?? "Invalid or expired link.")
          : "Something went wrong."
        setState("error")
        setErrorMsg(msg)
      })

    return cleanup
    // Intentionally empty deps — runs once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Container className="flex min-h-[60vh] max-w-md flex-col justify-center py-16">
      {state === "loading" && <p className="text-muted">Verifying your email…</p>}

      {state === "success" && (
        <div className="flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-pill bg-pop-lime text-ink">
            <Check size={26} />
          </span>
          <h1 className="display mt-5 text-2xl">Email verified</h1>
          <p className="mt-2 text-sm text-muted">
            You can now publish work. Taking you to your panel…
          </p>
        </div>
      )}

      {state === "error" && (
        <div>
          <h1 className="display text-2xl">That link didn't work</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">{errorMsg}</p>
          <p className="mt-1 text-sm text-muted">You can request a new link from your panel.</p>
          <Button className="mt-6" onClick={() => navigate("/panel")}>
            Go to panel
          </Button>
        </div>
      )}
    </Container>
  )
}
