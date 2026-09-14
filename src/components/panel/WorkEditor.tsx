import { useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/Button"
import { SchemaField, validateFields, type FieldErrors } from "./SchemaForm"
import { SkillPicker } from "./SkillPicker"
import { ThumbnailPicker } from "./ThumbnailPicker"
import { LinkListEditor, MetricEditor, SectionEditor } from "./ListEditors"
import { WorkCard } from "@/components/work/WorkCard"
import { COMMON_FIELDS, STORY_FIELDS, schemaFor } from "@/data/portfolioSchemas"
import { CATEGORIES, roleById } from "@/data/taxonomy"
import type { CategoryId } from "@/data/taxonomy"
import { TOPIC_QUOTA, topicUsage, type Account, type WorkDraft } from "@/data/account"
import { headlineProof } from "@/data/work"
import { workFromDraft } from "@/lib/workMapper"
import type { Author } from "@/lib/authors"
import { Check } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

interface WorkEditorProps {
  draft: WorkDraft
  account: Account
  author: Author
  /** Every other entry, so the per-topic quota can be enforced. */
  siblings: WorkDraft[]
  onSave: (draft: WorkDraft, publish: boolean) => void
  onRestart: () => void
  onDelete?: () => void
}

function Fieldset({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-card border border-line bg-card p-5 sm:p-6">
      <legend className="px-1 font-display text-sm font-semibold tracking-tight text-ink">
        {title}
      </legend>
      {intro && <p className="mt-1 text-xs leading-relaxed text-muted">{intro}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </fieldset>
  )
}

export function WorkEditor({
  draft,
  account,
  author,
  siblings,
  onSave,
  onRestart,
  onDelete,
}: WorkEditorProps) {
  const [state, setState] = useState<WorkDraft>(draft)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const schema = schemaFor(state.role)
  const guided = state.mode === "template"
  const preview = workFromDraft(state, account)

  // Quota is per topic and counts published entries only - drafts are free.
  const usage = useMemo(() => topicUsage(siblings, state.id), [siblings, state.id])

  function patch(part: Partial<WorkDraft>) {
    setState((current) => ({ ...current, ...part }))
    setSavedAt(null)
  }

  function updateField(name: string, value: string) {
    setState((current) => ({ ...current, values: { ...current.values, [name]: value } }))
    setErrors((current) => (current[name] ? { ...current, [name]: "" } : current))
    setSavedAt(null)
  }

  function toggleTopic(id: CategoryId) {
    const selected = state.topics.includes(id)
    if (!selected && (usage[id] ?? 0) >= TOPIC_QUOTA) return
    patch({ topics: selected ? state.topics.filter((t) => t !== id) : [...state.topics, id] })
    setErrors((current) => ({ ...current, topics: "" }))
  }

  function submit(publish: boolean) {
    if (publish) {
      const specs = guided ? [...COMMON_FIELDS, ...STORY_FIELDS, ...schema.fields] : COMMON_FIELDS
      const found = validateFields(specs, state.values)

      if (state.topics.length === 0) found.topics = "Pick at least one topic so people can find it."
      const overQuota = state.topics.filter((topic) => (usage[topic] ?? 0) >= TOPIC_QUOTA)
      if (overQuota.length > 0) {
        const names = overQuota.map((t) => CATEGORIES.find((c) => c.id === t)?.label).join(", ")
        found.topics = `You already have ${TOPIC_QUOTA} published entries in ${names}. Unpublish one, or choose another topic.`
      }
      if (state.skills.length === 0) found.skills = "Add at least one skill - the home filter uses these."
      if (!guided && !state.sections.some((s) => s.heading.trim() && s.body.trim())) {
        found.sections = "Write at least one section with a heading and some body text."
      }

      const active = Object.fromEntries(Object.entries(found).filter(([, message]) => message))
      if (Object.keys(active).length > 0) {
        setErrors(active)
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
        return
      }
    }

    onSave({ ...state, published: publish }, publish)
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:gap-10">
      <form
        className="flex min-w-0 flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          submit(true)
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink bg-ink px-5 py-4 text-paper">
          <div className="min-w-0">
            <p className="eyebrow text-paper/50">This entry</p>
            <p className="mt-1 font-display text-base font-semibold">
              {roleById(state.role).label} · {guided ? "guided template" : "your own structure"}
            </p>
            {state.role !== account.role && (
              <p className="mt-1 text-xs text-paper/60">
                Different craft from your profile ({roleById(account.role).label}) - that is fine.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onRestart}
            className="cursor-pointer rounded-pill border border-paper/25 px-4 py-2 font-display text-xs font-medium text-paper transition-colors duration-200 hover:bg-paper hover:text-ink"
          >
            Change craft or format
          </button>
        </div>

        <Fieldset title="The work">
          {COMMON_FIELDS.map((spec) => (
            <SchemaField
              key={spec.name}
              spec={spec}
              value={state.values[spec.name] ?? ""}
              error={errors[spec.name]}
              onChange={updateField}
            />
          ))}

          <TopicQuotaGroup
            selected={state.topics}
            usage={usage}
            onToggle={toggleTopic}
            error={errors.topics}
          />

          <SkillPicker
            role={state.role}
            value={state.skills}
            onChange={(skills) => {
              patch({ skills })
              setErrors((current) => ({ ...current, skills: "" }))
            }}
            error={errors.skills}
          />

          <ThumbnailPicker
            value={state.thumbnail}
            seed={state.id}
            role={state.role}
            metric={headlineProof(preview)?.value}
            onChange={(thumbnail) => patch({ thumbnail })}
          />
        </Fieldset>

        {guided ? (
          <>
            <Fieldset
              title="The story"
              intro="Three paragraphs, no jargon. This is the part reviewers actually read."
            >
              {STORY_FIELDS.map((spec) => (
                <SchemaField
                  key={spec.name}
                  spec={spec}
                  value={state.values[spec.name] ?? ""}
                  error={errors[spec.name]}
                  onChange={updateField}
                />
              ))}
            </Fieldset>

            <Fieldset title={`Evidence · ${roleById(state.role).label}`} intro={schema.intro}>
              {schema.fields.map((spec) => (
                <SchemaField
                  key={spec.name}
                  spec={spec}
                  value={state.values[spec.name] ?? ""}
                  error={errors[spec.name]}
                  onChange={updateField}
                />
              ))}
            </Fieldset>
          </>
        ) : (
          <>
            <Fieldset
              title="Your sections"
              intro="Your headings, your order. Reorder with the arrows; empty sections are dropped."
            >
              <SectionEditor value={state.sections} onChange={(sections) => patch({ sections })} />
              {errors.sections && (
                <p role="alert" className="text-xs font-medium text-pop-pink">
                  {errors.sections}
                </p>
              )}
            </Fieldset>

            <Fieldset title="Results">
              <MetricEditor value={state.metrics} onChange={(metrics) => patch({ metrics })} />
            </Fieldset>
          </>
        )}

        <Fieldset title="Links">
          <LinkListEditor value={state.links} onChange={(links) => patch({ links })} />
        </Fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <Button type="submit">{state.published ? "Update published entry" : "Publish"}</Button>
          <Button type="button" variant="outline" onClick={() => submit(false)}>
            Save draft
          </Button>
          {state.published && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onSave({ ...state, published: false }, false)
                setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
              }}
            >
              Unpublish
            </Button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto cursor-pointer font-display text-sm font-medium text-muted underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-pop-pink hover:decoration-pop-pink"
            >
              Delete entry
            </button>
          )}
          {savedAt && (
            <p
              role="status"
              className="flex w-full items-center gap-1.5 font-display text-xs font-medium text-ink-2"
            >
              <Check size={14} className="text-pop-violet" />
              Saved at {savedAt} - stored in this browser only.
            </p>
          )}
        </div>
      </form>

      {/* Live preview: people write better entries when they can see the card. */}
      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
        <p className="eyebrow">Preview</p>
        <div className="mt-4 flex min-w-0">
          <WorkCard work={preview} author={author} index={0} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Without an upload the cover is drawn from your craft and headline result - so an entry
          under NDA is never penalised for having no screenshot.
        </p>
      </aside>
    </div>
  )
}

/**
 * Topics double as a quota: two published entries per topic, per person. The
 * cap is visible in the chips rather than only appearing as an error at the
 * end, so nobody writes a third SaaS case study before finding out.
 */
function TopicQuotaGroup({
  selected,
  usage,
  onToggle,
  error,
}: {
  selected: CategoryId[]
  usage: Record<string, number>
  onToggle: (id: CategoryId) => void
  error?: string
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-display text-sm font-medium text-ink">Topics</legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const used = usage[category.id] ?? 0
          const isSelected = selected.includes(category.id)
          const atCap = !isSelected && used >= TOPIC_QUOTA

          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isSelected}
              disabled={atCap}
              title={atCap ? `${TOPIC_QUOTA} published entries already in ${category.label}` : undefined}
              onClick={() => onToggle(category.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-pill border px-4 py-2.5",
                "font-display text-sm font-medium transition-all duration-200 ease-pop active:scale-[0.97]",
                isSelected
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-card text-ink-2 hover:border-ink/40",
                atCap && "cursor-not-allowed opacity-40 hover:border-line",
              )}
            >
              {category.label}
              <span className={cn("text-[0.6875rem]", isSelected ? "text-paper/60" : "text-muted")}>
                {used}/{TOPIC_QUOTA}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted">
        Two published entries per topic. It keeps the directory readable and forces you to lead
        with your best two.
      </p>
      {error && (
        <p role="alert" className="text-xs font-medium text-pop-pink">
          {error}
        </p>
      )}
    </fieldset>
  )
}
