import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Field, TextArea } from "@/components/ui/Field"
import { Check } from "@/components/ui/Icon"
import { REPORT_REASONS, type ReportReasonId, type Target } from "@/data/admin"
import { useAdmin } from "@/hooks/useAdmin"
import { cn } from "@/lib/utils"

interface ReportModalProps {
  open: boolean
  onClose: () => void
  target: Target | null
  /** What the reader is looking at, so the dialog names it back to them. */
  label: string
}

/**
 * Reporting is deliberately low-friction and low-promise.
 *
 * No account required, because requiring one would mean the only people who
 * report are the ones already invested. And the confirmation says a human will
 * look rather than that anything will be removed, because a report is a
 * request for review and saying otherwise sets up a disappointment.
 */
export function ReportModal({ open, onClose, target, label }: ReportModalProps) {
  const { report } = useAdmin()
  const [reason, setReason] = useState<ReportReasonId | null>(null)
  const [note, setNote] = useState("")
  const [sent, setSent] = useState(false)

  function close() {
    onClose()
    // Reset after the dialog is gone, so the reader does not watch it empty.
    window.setTimeout(() => {
      setReason(null)
      setNote("")
      setSent(false)
    }, 200)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={sent ? "Thank you" : "Report this"}
      description={sent ? undefined : label}
    >
      {sent ? (
        <div className="flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-2 rounded-pill bg-pop-lime px-3 py-1.5 font-display text-xs font-semibold text-ink">
            <Check size={15} />
            Sent for review
          </span>
          <p className="text-sm leading-relaxed text-ink-2">
            A moderator will look at this. We cannot promise an outcome: a report is a request for
            review, not a removal. Nothing about you was recorded, and in this build the report
            stays in your own browser.
          </p>
          <Button onClick={close}>Close</Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (!reason || !target) return
            report(target, reason, note)
            setSent(true)
          }}
        >
          <fieldset>
            <legend className="mb-3 font-display text-sm font-medium text-ink">
              What is wrong with it?
            </legend>
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((option) => {
                const active = reason === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setReason(option.id)}
                    className={cn(
                      "cursor-pointer rounded-pill border px-4 py-2.5 font-display text-sm font-medium",
                      "transition-all duration-200 ease-pop active:scale-[0.97]",
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-card text-ink-2 hover:border-ink/40",
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Field
            label="Anything else?"
            hint="Optional, and usually the most useful part. What should a moderator look at?"
          >
            {({ id, invalid }) => (
              <TextArea
                id={id}
                rows={3}
                invalid={invalid}
                value={note}
                placeholder="The figure in the headline does not match the one in the outcome."
                onChange={(event) => setNote(event.target.value)}
              />
            )}
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!reason}>
              Send report
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/** The affordance itself: quiet, and never competing with the content. */
export function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer font-display text-xs font-medium text-muted underline decoration-ink/20 underline-offset-4 transition-colors duration-200 hover:text-ink hover:decoration-pop-pink"
    >
      Report this
    </button>
  )
}
