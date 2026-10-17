import { useMemo, useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/Button"
import { Combobox } from "@/components/ui/Combobox"
import { Check } from "@/components/ui/Icon"
import { SchemaField } from "./SchemaForm"
import { SkillPicker } from "./SkillPicker"
import { ThumbnailPicker } from "./ThumbnailPicker"
import { LinkListEditor, MetricEditor, SectionEditor } from "./ListEditors"
import { FigureEditor } from "./FigureEditor"
import { WorkEditorAside } from "./WorkEditorAside"
import { TopicQuotaGroup } from "./TopicQuotaGroup"
import { ConfidentialityNote } from "./ConfidentialityNote"
import { readinessFor } from "@/lib/readiness"
import { workValuesSchema, type WorkValues } from "@/lib/validation/workValues"
import { dataUrlBytes } from "@/lib/image"
import { track } from "@/lib/analytics"
import { COMMON_FIELDS, STORY_FIELDS } from "@/data/portfolioSchemas"
import { fieldsForTemplate, templateHeadline, templatesFor } from "@/data/workTemplates"
import { CATEGORIES, roleById, type CategoryId } from "@/data/taxonomy"
import { TOPIC_QUOTA, topicUsage, type Account, type WorkDraft } from "@/data/account"
import { headlineProof } from "@/data/work"
import { workFromDraft } from "@/lib/workMapper"
import type { Author } from "@/lib/authors"

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

function Fieldset({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: ReactNode
}) {
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
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const form = useForm<WorkValues>({
    defaultValues: draft.values,
    mode: "onSubmit",
  })
  // `watch()` re-renders on every keystroke so the preview and readiness stay
  // live. The values are still the single source for the fields.
  const values = form.watch()
  const fieldErrors = form.formState.errors as Record<
    string,
    { message?: string } | undefined
  >
  const errorFor = (name: string) => fieldErrors[name]?.message

  const templateFields = fieldsForTemplate(state.role, state.template)
  const template = templateHeadline(state.role, state.template)
  const guided = state.mode === "template"

  const previewDraft: WorkDraft = { ...state, values }
  const preview = workFromDraft(previewDraft, account)

  // Figures attach to chapters, and a free-form entry's chapters are whatever
  // the author named them - so the options follow the entry, not a constant.
  const figureSections = useMemo(
    () =>
      guided
        ? [
            { value: "problem", label: "The problem" },
            { value: "approach", label: "What you did" },
            { value: "outcome", label: "What changed" },
          ]
        : state.sections
            .filter((section) => section.heading.trim())
            .map((section) => ({ value: section.heading, label: section.heading })),
    [guided, state.sections],
  )

  const otherBytes = useMemo(
    () => (state.thumbnail ? dataUrlBytes(state.thumbnail) : 0),
    [state.thumbnail],
  )

  // Quota is per topic and counts published entries only - drafts are free.
  const usage = useMemo(() => topicUsage(siblings, state.id), [siblings, state.id])

  // Computed from the same draft the publish check validates, so the panel can
  // never promise something publish then refuses.
  const readiness = readinessFor(previewDraft, usage)

  function patch(part: Partial<WorkDraft>) {
    setState((current) => ({ ...current, ...part }))
    setSavedAt(null)
  }

  function updateField(name: string, value: string) {
    form.setValue(name, value, { shouldDirty: true })
    form.clearErrors(name)
    setSavedAt(null)
  }

  function toggleTopic(id: CategoryId) {
    const selected = state.topics.includes(id)
    if (!selected && (usage[id] ?? 0) >= TOPIC_QUOTA) return
    if (!selected && state.topics.length >= 4) return
    patch({ topics: selected ? state.topics.filter((t) => t !== id) : [...state.topics, id] })
    form.clearErrors("topics")
  }

  function submit(publish: boolean) {
    if (publish && !account.emailVerifiedAt) {
      form.setError("form", {
        message: "Confirm your email address before publishing. Drafts are unaffected.",
      })
      return
    }

    if (publish) {
      const specs = guided ? [...COMMON_FIELDS, ...STORY_FIELDS, ...templateFields] : COMMON_FIELDS
      const found: Record<string, string> = {}

      const parsed = workValuesSchema(specs).safeParse(form.getValues())
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form")
          if (!found[key]) found[key] = issue.message
        }
      }

      if (state.topics.length === 0) found.topics = "Pick at least one topic so people can find it."
      const overQuota = state.topics.filter((topic) => (usage[topic] ?? 0) >= TOPIC_QUOTA)
      if (overQuota.length > 0) {
        const names = overQuota.map((t) => CATEGORIES.find((c) => c.id === t)?.label).join(", ")
        found.topics = `You already have ${TOPIC_QUOTA} published entries in ${names}. Revert one to draft, or choose another topic.`
      }
      if (state.skills.length === 0)
        found.skills = "Add at least one skill - the home filter uses these."
      const unfinished = (state.figures ?? []).filter(
        (figure) => !figure.alt.trim() || !figure.caption.trim(),
      ).length
      if (unfinished > 0) {
        found.figures = `${unfinished} ${unfinished === 1 ? "figure needs" : "figures need"} alt text and a caption. An uncaptioned image is decoration.`
      }
      if (!guided && !state.sections.some((s) => s.heading.trim() && s.body.trim())) {
        found.sections = "Write at least one section with a heading and some body text."
      }

      if (Object.keys(found).length > 0) {
        form.clearErrors()
        for (const [name, message] of Object.entries(found)) form.setError(name, { message })
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
        // Counted because it is the interesting failure: people who tried to
        // publish and were turned back are the ones the form is losing.
        track("entry_publish_blocked")
        return
      }
    }

    track(publish ? "entry_published" : "entry_saved_draft")
    // Saving without publishing keeps the current status: "Save draft" on an
    // already-published entry should not quietly take it down. Reverting is the
    // explicit action that does that.
    const nextPublished = publish ? true : state.published
    onSave({ ...state, values: form.getValues(), published: nextPublished }, publish)
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
              {roleById(state.role).label} · {guided ? template.label : "your own structure"}
            </p>
            {state.role !== account.role && (
              <p className="mt-1 text-xs text-paper/60">
                Different craft from your profile ({roleById(account.role).label}) - that is fine.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {guided && (
              <label className="sr-only" htmlFor="template-switch">
                Template
              </label>
            )}
            {guided && (
              <Combobox
                id="template-switch"
                value={state.template}
                onChange={(next) => patch({ template: next })}
                options={templatesFor(state.role).map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                emptyLabel="Choose a template"
                className="min-w-40 rounded-pill border border-paper/25 bg-transparent px-4 py-2 text-xs text-paper hover:bg-paper/10 focus:border-paper/50"
                chevronClassName="text-paper/60"
              />
            )}
            <button
              type="button"
              onClick={onRestart}
              className="cursor-pointer rounded-pill border border-paper/25 px-4 py-2 font-display text-xs font-medium text-paper transition-colors duration-200 hover:bg-paper hover:text-ink"
            >
              Change craft or format
            </button>
          </div>
        </div>

        <Fieldset title="The work">
          {COMMON_FIELDS.map((spec) => (
            <SchemaField
              key={spec.name}
              spec={spec}
              value={values[spec.name] ?? ""}
              error={errorFor(spec.name)}
              onChange={updateField}
            />
          ))}

          <TopicQuotaGroup
            selected={state.topics}
            usage={usage}
            onToggle={toggleTopic}
            error={errorFor("topics")}
          />

          <SkillPicker
            role={state.role}
            value={state.skills}
            onChange={(skills) => {
              patch({ skills })
              form.clearErrors("skills")
            }}
            error={errorFor("skills")}
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
                  value={values[spec.name] ?? ""}
                  error={errorFor(spec.name)}
                  onChange={updateField}
                />
              ))}
            </Fieldset>

            {/* Placed where the figure gets typed, not in the terms nobody
                reads. This product asks for the one thing an NDA usually
                covers, so the warning belongs at the moment of the decision. */}
            <ConfidentialityNote />

            <Fieldset title={`Evidence · ${template.label}`} intro={template.intro}>
              {templateFields.map((spec) => (
                <SchemaField
                  key={spec.name}
                  spec={spec}
                  value={values[spec.name] ?? ""}
                  error={errorFor(spec.name)}
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
              {errorFor("sections") && (
                <p role="alert" className="text-xs font-medium text-pop-pink">
                  {errorFor("sections")}
                </p>
              )}
            </Fieldset>

            <ConfidentialityNote />

            <Fieldset title="Results">
              <MetricEditor value={state.metrics} onChange={(metrics) => patch({ metrics })} />
            </Fieldset>
          </>
        )}

        <Fieldset
          title="Figures & video"
          intro="Optional. Screenshots, diagrams, before and after, or a YouTube, Vimeo or Loom link - each one sits under the chapter you assign it to, and the page picks the layout from what you added. A wide screenshot and a phone screen do not get the same treatment, and a design system reads better with the walkthrough next to the artefacts than either one alone."
        >
          <FigureEditor
            figures={state.figures ?? []}
            sections={
              figureSections.length > 0
                ? figureSections
                : [{ value: "problem", label: "Add a section heading first" }]
            }
            otherBytes={otherBytes}
            onChange={(figures) => {
              patch({ figures })
              form.clearErrors("figures")
            }}
            error={errorFor("figures")}
          />
        </Fieldset>

        <Fieldset title="Links">
          <LinkListEditor value={state.links} onChange={(links) => patch({ links })} />
        </Fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <Button type="submit" disabled={!state.published && !account.emailVerifiedAt}>
            {state.published ? "Update published entry" : "Publish"}
          </Button>
          <Button type="button" variant="outline" onClick={() => submit(false)}>
            Save draft
          </Button>
          {state.published && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const values = form.getValues()
                onSave({ ...state, values, published: false }, false)
                setState((current) => ({ ...current, values, published: false }))
                setSavedAt(
                  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                )
              }}
            >
              Revert to draft
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
          {errorFor("form") && (
            <p role="alert" className="w-full text-xs font-medium text-pop-pink">
              {errorFor("form")}
            </p>
          )}
          {!state.published && !account.emailVerifiedAt && !errorFor("form") && (
            <p className="w-full text-xs leading-relaxed text-muted">
              Verify your email before publishing. Your drafts are safe, and you can send a link
              from the panel overview.
            </p>
          )}
          {savedAt && (
            <p
              role="status"
              className="flex w-full items-center gap-1.5 font-display text-xs font-medium text-ink-2"
            >
              <Check size={14} className="text-pop-violet" />
              Saved at {savedAt}.
            </p>
          )}
        </div>
      </form>

      {/* Live preview: people write better entries when they can see the card. */}
      <WorkEditorAside
        readiness={readiness}
        published={state.published}
        preview={preview}
        author={author}
      />
    </div>
  )
}
