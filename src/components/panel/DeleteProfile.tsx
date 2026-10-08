import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/Button"
import { apiErrorMessage } from "@/lib/api/client"

export function DeleteProfile({ onDelete }: { onDelete: () => Promise<void> }) {
  const navigate = useNavigate()
  const [armed, setArmed] = useState(false)
  const [working, setWorking] = useState(false)

  async function confirmDelete() {
    setWorking(true)
    try {
      await onDelete()
      toast.success("Account deleted.")
      navigate("/")
    } catch (err) {
      toast.error(apiErrorMessage(err))
      setWorking(false)
    }
  }

  return (
    <div className="mt-2 border-t border-line pt-6">
      <p className="font-display text-sm font-semibold text-ink">Delete profile</p>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
        Removes your account, every entry you published, the images you uploaded, your traffic
        history and your notices. The record of moderation decisions about your content is kept, as
        the content policy describes. This cannot be undone.
      </p>

      {armed ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" disabled={working} onClick={confirmDelete}>
            {working ? "Deleting…" : "Yes, delete everything"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={working}
            onClick={() => setArmed(false)}
          >
            Keep it
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="mt-4 cursor-pointer font-display text-sm font-medium text-muted underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-pop-pink hover:decoration-pop-pink"
        >
          Delete my profile
        </button>
      )}
    </div>
  )
}
