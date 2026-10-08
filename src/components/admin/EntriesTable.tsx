import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { Eye } from "@/components/ui/Icon"
import { useAdmin } from "@/hooks/useAdmin"
import type { Work } from "@/data/work"
import { cn } from "@/lib/utils"
import { ActionForm, Empty, Row } from "./primitives"

export function EntriesSection({ allWork }: { allWork: Work[] }) {
  const navigate = useNavigate()
  const admin = useAdmin()
  const [query, setQuery] = useState("")
  const [onlyHidden, setOnlyHidden] = useState(false)

  const shown = allWork.filter((item) => {
    if (onlyHidden && !admin.isWorkHidden(item.id)) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${item.title} ${item.summary} ${item.authorId}`.toLowerCase().includes(needle)
  })

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search entries"
          aria-label="Search entries"
          className="h-11 flex-1 rounded-pill border border-ink/15 bg-card px-4 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button
          type="button"
          aria-pressed={onlyHidden}
          onClick={() => setOnlyHidden((current) => !current)}
          className={cn(
            "h-11 shrink-0 cursor-pointer rounded-pill border px-4 font-display text-sm font-medium transition-colors duration-200",
            onlyHidden
              ? "border-ink bg-ink text-paper"
              : "border-ink/15 bg-card text-ink-2 hover:border-ink/40",
          )}
        >
          Withheld only ({admin.state.hiddenWork.length})
        </button>
      </div>

      <p className="mt-4 text-sm text-muted">
        <span className="font-display font-semibold text-ink">{shown.length}</span> of{" "}
        {allWork.length} entries
      </p>

      <ul className="mt-2">
        {shown.map((item) => {
          const hidden = admin.isWorkHidden(item.id)
          return (
            <Row
              key={item.id}
              title={item.title}
              meta={`${item.authorId} · ${item.year} · ${hidden ? "withheld from the directory" : "live"}`}
            >
              <Button size="sm" variant="ghost" onClick={() => navigate(`/work/${item.id}`)}>
                <Eye size={15} />
                Open
              </Button>
              {hidden ? (
                <ActionForm
                  label="Republish"
                  placeholder="Why is this going back up?"
                  onSubmit={(reason) =>
                    admin.setWorkHidden(item.id, false, item.title, reason, item.authorId)
                  }
                />
              ) : (
                <ActionForm
                  label="Unpublish"
                  destructive
                  placeholder="Why is this coming down?"
                  onSubmit={(reason) =>
                    admin.setWorkHidden(item.id, true, item.title, reason, item.authorId)
                  }
                />
              )}
            </Row>
          )
        })}
      </ul>
      {shown.length === 0 && (
        <Empty title="No entries match" body="Clear the search or the withheld filter." />
      )}
    </div>
  )
}
