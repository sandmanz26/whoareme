import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PanelShell, type PanelNavItem } from "@/components/panel/PanelShell"
import { WorkStarter } from "@/components/panel/WorkStarter"
import { WorkEditor } from "@/components/panel/WorkEditor"
import { WorkCover } from "@/components/work/WorkCover"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { ArrowUpRight, Plus } from "@/components/ui/Icon"
import { defaultTemplateId } from "@/data/workTemplates"
import {
  emptyDraft,
  TOPIC_QUOTA,
  topicUsage,
  type Account,
  type WorkDraft,
  type WorkMode,
} from "@/data/account"
import { CATEGORIES, roleById, type RoleId } from "@/data/taxonomy"
import { draftCompleteness } from "@/lib/workMapper"
import type { Author } from "@/lib/authors"
import type { GuestAuthor } from "@/context/BrowseContext"

export function PortfolioSection({
  entryId,
  items,
  account,
  author,
  drafts,
  onSave,
  onDelete,
  opens,
}: {
  entryId: string | undefined
  items: PanelNavItem[]
  account: Account
  author: Author | GuestAuthor
  drafts: WorkDraft[]
  onSave: (draft: WorkDraft) => Promise<WorkDraft>
  onDelete: (id: string) => Promise<void>
  opens: Record<string, number>
}) {
  const navigate = useNavigate()
  const target = entryId
  const existing = useMemo(() => drafts.find((d) => d.id === target), [drafts, target])

  const [mode, setMode] = useState<WorkMode>("template")
  const [pendingRole, setPendingRole] = useState<RoleId | null>(null)
  const [newDraft, setNewDraft] = useState<WorkDraft | null>(null)

  const [lastTarget, setLastTarget] = useState(target)
  if (target !== lastTarget) {
    setLastTarget(target)
    if (target === "new") {
      setNewDraft(null)
      setMode("template")
      setPendingRole(null)
    }
  }

  if (target === "new") {
    return (
      <PanelShell
        items={items}
        activeId="portfolio"
        title={newDraft ? "New entry" : "Add work"}
        description={
          newDraft
            ? "Fill in what you can - you can save a draft and come back."
            : "Three choices, then you write."
        }
      >
        {newDraft ? (
          <WorkEditor
            key={newDraft.id}
            draft={newDraft}
            account={account}
            author={author}
            siblings={drafts}
            onRestart={() => {
              setNewDraft(null)
              setPendingRole(null)
            }}
            onSave={async (next) => {
              const saved = await onSave(next)
              navigate(`/panel/portfolio/${saved.id}`, { replace: true })
            }}
          />
        ) : (
          <>
            <WorkStarter
              mode={mode}
              role={pendingRole}
              profileRole={account.role}
              onModeChange={(next) => {
                setMode(next)
                if (next === "custom" && pendingRole) {
                  setNewDraft(emptyDraft(pendingRole, "custom", defaultTemplateId(pendingRole)))
                }
              }}
              onRoleSelect={(role) => {
                setPendingRole(role)
                if (mode === "custom")
                  setNewDraft(emptyDraft(role, "custom", defaultTemplateId(role)))
              }}
              onTemplateSelect={(role, template) => setNewDraft(emptyDraft(role, mode, template))}
            />
            <Button variant="ghost" className="mt-8" onClick={() => navigate("/panel/portfolio")}>
              Cancel
            </Button>
          </>
        )}
      </PanelShell>
    )
  }

  if (existing) {
    return (
      <PanelShell
        items={items}
        activeId="portfolio"
        title={existing.values.title || "Untitled entry"}
        description={`${roleById(existing.role).label} · ${
          existing.mode === "template" ? "guided template" : "own structure"
        } · ${existing.published ? "published" : "draft"}`}
      >
        <WorkEditor
          key={existing.id}
          draft={existing}
          account={account}
          author={author}
          siblings={drafts}
          onRestart={() => navigate("/panel/portfolio/new")}
          onSave={(next) => {
            onSave(next)
          }}
          onDelete={async () => {
            await onDelete(existing.id)
            navigate("/panel/portfolio")
          }}
        />
      </PanelShell>
    )
  }

  const usage = topicUsage(drafts)
  const atCap = CATEGORIES.filter((category) => (usage[category.id] ?? 0) >= TOPIC_QUOTA)

  return (
    <PanelShell
      items={items}
      activeId="portfolio"
      title="Portfolio"
      description="Each entry carries its own craft and format - they do not have to match your profile."
      action={
        <Button onClick={() => navigate("/panel/portfolio/new")}>
          <Plus size={16} />
          Add work
        </Button>
      }
    >
      {atCap.length > 0 && (
        <p className="mb-5 rounded-card border border-dashed border-ink/20 px-5 py-3.5 text-xs leading-relaxed text-muted">
          <span className="font-display font-semibold text-ink">Topic quota reached</span> for{" "}
          {atCap.map((category) => category.label).join(", ")}. Two published entries per topic -
          unpublish one to make room.
        </p>
      )}

      {drafts.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink/20 bg-card px-6 py-16 text-center">
          <h2 className="display text-xl">No entries yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Start with the piece of work you would actually talk about in an interview.
          </p>
          <Button className="mt-6" onClick={() => navigate("/panel/portfolio/new")}>
            <Plus size={16} />
            Add your first entry
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {drafts.map((draft) => {
            const percent = Math.round(draftCompleteness(draft) * 100)
            return (
              <li key={draft.id} className="relative">
                <div className="group flex w-full cursor-pointer flex-col gap-3 rounded-card border border-line bg-card p-5 text-left transition-all duration-250 ease-pop hover:-translate-y-0.5 hover:border-ink/30 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    {draft.thumbnail ? (
                      <img
                        src={draft.thumbnail}
                        alt=""
                        className="hidden aspect-[16/9] w-28 shrink-0 rounded-xl border border-line object-cover sm:block"
                      />
                    ) : (
                      <WorkCover
                        seed={draft.id}
                        role={draft.role}
                        className="hidden aspect-[16/9] w-28 shrink-0 rounded-xl sm:block"
                      />
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-ink/20 bg-paper-2">
                          {roleById(draft.role).label}
                        </Badge>
                        <Badge
                          className={
                            draft.published
                              ? "border-ink/20 bg-pop-lime text-ink"
                              : "border-dashed border-ink/25 bg-card"
                          }
                        >
                          {draft.published ? "Published" : "Draft"}
                        </Badge>
                        {draft.mode === "custom" && <Badge>Own structure</Badge>}
                      </div>
                      <p className="mt-2.5 truncate font-display text-base font-semibold text-ink">
                        {draft.values.title || "Untitled entry"}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted">
                        {draft.values.summary || "No summary yet"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <div className="w-28">
                      <div className="h-1.5 overflow-hidden rounded-pill bg-paper-2">
                        <div
                          className="h-full rounded-pill bg-ink"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-1.5 font-display text-[0.6875rem] text-muted">
                        {percent}% complete
                      </p>
                      {draft.published && (
                        <p className="mt-1 font-display text-[0.6875rem] text-muted">
                          {opens[draft.id] ?? 0} {(opens[draft.id] ?? 0) === 1 ? "open" : "opens"}
                        </p>
                      )}
                    </div>

                    {draft.published && (
                      <button
                        type="button"
                        onClick={() => onSave({ ...draft, published: false })}
                        className="relative z-10 cursor-pointer rounded-pill border border-ink/15 bg-card px-3 py-2 font-display text-xs font-medium text-ink-2 transition-colors duration-200 hover:border-ink hover:text-ink"
                      >
                        Revert to draft
                        <span className="sr-only"> - {draft.values.title || "Untitled entry"}</span>
                      </button>
                    )}

                    <ArrowUpRight
                      size={18}
                      className="text-muted transition-colors duration-200 group-hover:text-ink"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/panel/portfolio/${draft.id}`)}
                  className="absolute inset-0 cursor-pointer rounded-card"
                >
                  <span className="sr-only">Edit {draft.values.title || "Untitled entry"}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </PanelShell>
  )
}
