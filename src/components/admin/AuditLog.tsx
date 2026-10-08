import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/Badge"
import { ArrowUpRight } from "@/components/ui/Icon"
import { useAdmin } from "@/hooks/useAdmin"
import { actionLabel } from "@/data/admin"
import { Empty } from "./primitives"

export function LogSection() {
  const navigate = useNavigate()
  const admin = useAdmin()

  if (admin.state.log.length === 0) {
    return (
      <Empty
        title="No decisions yet"
        body="Every unpublish, suspension, dismissal and settings change lands here with the reason given at the time."
      />
    )
  }

  return (
    <ul>
      {admin.state.log.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1 border-t border-line py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-ink/20 bg-paper-2">{actionLabel(entry.action)}</Badge>
            <span className="font-display text-sm font-semibold text-ink">{entry.targetLabel}</span>
            {entry.target && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    entry.target!.kind === "work"
                      ? `/work/${entry.target!.id}`
                      : `/people/${entry.target!.id}`,
                  )
                }
                className="inline-flex cursor-pointer items-center gap-1 font-display text-xs font-medium text-muted transition-colors duration-200 hover:text-ink"
              >
                Open
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed text-ink-2">{entry.reason}</p>
          <p className="text-xs text-muted">
            {new Date(entry.at).toLocaleString()} · {entry.by}
          </p>
        </li>
      ))}
    </ul>
  )
}
