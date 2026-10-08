import { useState } from "react"
import { toast } from "react-hot-toast"
import { apiErrorMessage } from "@/lib/api/client"
import { postVerifyRequest } from "@/lib/api/endpoints/auth"

export function VerifyEmailBanner() {
  const [sent, setSent] = useState(false)
  const [working, setWorking] = useState(false)

  async function sendLink() {
    setWorking(true)
    try {
      await postVerifyRequest()
      setSent(true)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="mb-4 rounded-card border border-pop-tangerine/40 bg-pop-tangerine/8 px-4 py-3 text-sm">
      {sent ? (
        <p className="text-muted">
          Verification link sent - check your inbox (valid for 24 hours).
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="size-2 shrink-0 rounded-full bg-pop-tangerine" />
            <p className="font-medium text-ink">
              Verify your email to publish work.{" "}
              <span className="font-normal text-muted">Without it your entries stay private.</span>
            </p>
          </div>
          <button
            type="button"
            onClick={sendLink}
            disabled={working}
            className="shrink-0 cursor-pointer rounded-pill border border-pop-tangerine bg-pop-tangerine/10 px-3 py-1.5 font-display text-xs font-semibold text-pop-tangerine transition-colors duration-200 hover:bg-pop-tangerine hover:text-paper disabled:opacity-50"
          >
            {working ? "Sending…" : "Send verification link"}
          </button>
        </div>
      )}
    </div>
  )
}
