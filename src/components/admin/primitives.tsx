import { useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

/** A one-line form that asks for a reason before it lets a moderator act. */
export function ActionForm({
  label,
  placeholder,
  destructive,
  onSubmit,
}: {
  label: string
  placeholder: string
  destructive?: boolean
  onSubmit: (reason: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  if (!open) {
    return (
      <Button size="sm" variant={destructive ? "primary" : "outline"} onClick={() => setOpen(true)}>
        {label}
      </Button>
    )
  }

  return (
    <form
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(reason)
        setReason("")
        setOpen(false)
      }}
    >
      <input
        autoFocus
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={placeholder}
        aria-label={`Reason for: ${label}`}
        className="h-10 min-w-0 flex-1 rounded-pill border border-ink/15 bg-card px-4 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />
      <div className="flex shrink-0 gap-2">
        <Button size="sm" type="submit" variant={destructive ? "primary" : "pop"}>
          {label}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function Row({
  title,
  meta,
  children,
  tint,
}: {
  title: string
  meta: string
  children: ReactNode
  tint?: string
}) {
  return (
    <li className="flex flex-col gap-3 border-t border-line py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{meta}</p>
        </div>
        {tint && (
          <Badge className={tint}>
            {tint.includes("pink") ? "High" : tint.includes("tangerine") ? "Medium" : "Low"}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  )
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-dashed border-ink/20 px-6 py-12 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>
    </div>
  )
}
