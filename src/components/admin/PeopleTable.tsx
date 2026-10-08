import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { Eye } from "@/components/ui/Icon"
import { useAdmin } from "@/hooks/useAdmin"
import type { Person } from "@/data/people"
import type { Work } from "@/data/work"
import { ActionForm, Row } from "./primitives"

export function PeopleSection({ allPeople, allWork }: { allPeople: Person[]; allWork: Work[] }) {
  const navigate = useNavigate()
  const admin = useAdmin()
  const [query, setQuery] = useState("")

  const counts = new Map<string, number>()
  for (const item of allWork) counts.set(item.authorId, (counts.get(item.authorId) ?? 0) + 1)

  const shown = allPeople.filter((person) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${person.name} ${person.title} ${person.company} ${person.location}`
      .toLowerCase()
      .includes(needle)
  })

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search people"
        aria-label="Search people"
        className="h-11 w-full rounded-pill border border-ink/15 bg-card px-4 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />

      <p className="mt-4 text-sm text-muted">
        <span className="font-display font-semibold text-ink">{shown.length}</span> of{" "}
        {allPeople.length} people · {admin.state.suspendedPeople.length} suspended
      </p>

      <ul className="mt-2">
        {shown.map((person) => {
          const suspended = admin.isPersonSuspended(person.id)
          const entries = counts.get(person.id) ?? 0
          return (
            <Row
              key={person.id}
              title={person.name}
              meta={`${person.title} · ${person.company} · ${entries} ${entries === 1 ? "entry" : "entries"}${suspended ? " · suspended" : ""}`}
            >
              <Button size="sm" variant="ghost" onClick={() => navigate(`/people/${person.id}`)}>
                <Eye size={15} />
                Open
              </Button>
              {suspended ? (
                <ActionForm
                  label="Reinstate"
                  placeholder="Why is this profile coming back?"
                  onSubmit={(reason) =>
                    admin.setPersonSuspended(person.id, false, person.name, reason)
                  }
                />
              ) : (
                <ActionForm
                  label="Suspend"
                  destructive
                  placeholder="Why is this profile being withheld?"
                  onSubmit={(reason) =>
                    admin.setPersonSuspended(person.id, true, person.name, reason)
                  }
                />
              )}
            </Row>
          )
        })}
      </ul>
    </div>
  )
}
