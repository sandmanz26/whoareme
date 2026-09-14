import { ChevronDown, Plus, Trash } from "@/components/ui/Icon"
import type { WorkLink, WorkSection } from "@/data/work"

const CONTROL =
  "w-full rounded-2xl border border-line bg-card px-4 py-3 text-sm text-ink " +
  "transition-colors duration-200 placeholder:text-muted/70 focus:border-ink focus:outline-none"

function AddButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-pill border border-dashed border-ink/25 px-4 py-2.5 font-display text-sm font-medium text-muted transition-colors duration-200 hover:border-ink hover:text-ink"
    >
      <Plus size={15} />
      {children}
    </button>
  )
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-2xl text-muted transition-colors duration-200 hover:bg-paper hover:text-pop-pink"
    >
      <Trash size={16} />
    </button>
  )
}

/** The repeatable "what can I actually look at" list: repo, live URL, deck, doc. */
export function LinkListEditor({
  value,
  onChange,
}: {
  value: WorkLink[]
  onChange: (links: WorkLink[]) => void
}) {
  function patch(index: number, part: Partial<WorkLink>) {
    onChange(value.map((link, i) => (i === index ? { ...link, ...part } : link)))
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-display text-sm font-medium text-ink">Portfolio links</p>
        <p className="mt-1 text-xs text-muted">
          Repo, live environment, case study, deck - whatever a reviewer can open.
        </p>
      </div>

      {value.map((link, index) => (
        <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <input
            className={`${CONTROL} sm:w-48`}
            value={link.label}
            placeholder="Label (Repo)"
            aria-label={`Link ${index + 1} label`}
            onChange={(event) => patch(index, { label: event.target.value })}
          />
          <input
            className={CONTROL}
            type="url"
            value={link.href}
            placeholder="https://"
            aria-label={`Link ${index + 1} URL`}
            onChange={(event) => patch(index, { href: event.target.value })}
          />
          <RemoveButton
            label={`Remove link ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          />
        </div>
      ))}

      <AddButton onClick={() => onChange([...value, { label: "", href: "" }])}>
        {value.length === 0 ? "Add a link" : "Add another link"}
      </AddButton>
    </div>
  )
}

/** Free-form mode: the author writes their own headings. */
export function SectionEditor({
  value,
  onChange,
}: {
  value: WorkSection[]
  onChange: (sections: WorkSection[]) => void
}) {
  function patch(index: number, part: Partial<WorkSection>) {
    onChange(value.map((section, i) => (i === index ? { ...section, ...part } : section)))
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      {value.map((section, index) => (
        <div key={index} className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-start gap-2">
            <input
              className={`${CONTROL} font-display font-semibold`}
              value={section.heading}
              placeholder="Section heading"
              aria-label={`Section ${index + 1} heading`}
              onChange={(event) => patch(index, { heading: event.target.value })}
            />
            <div className="flex shrink-0 flex-col justify-center">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move section ${index + 1} up`}
                className="grid size-6 cursor-pointer place-items-center rounded text-muted transition-colors duration-200 hover:text-ink disabled:opacity-25"
              >
                <ChevronDown size={15} className="rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === value.length - 1}
                aria-label={`Move section ${index + 1} down`}
                className="grid size-6 cursor-pointer place-items-center rounded text-muted transition-colors duration-200 hover:text-ink disabled:opacity-25"
              >
                <ChevronDown size={15} />
              </button>
            </div>
            <RemoveButton
              label={`Remove section ${index + 1}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            />
          </div>

          <textarea
            className={`${CONTROL} mt-2 resize-y`}
            rows={4}
            value={section.body}
            placeholder="Write it the way you would explain it out loud."
            aria-label={`Section ${index + 1} body`}
            onChange={(event) => patch(index, { body: event.target.value })}
          />
        </div>
      ))}

      <AddButton onClick={() => onChange([...value, { heading: "", body: "" }])}>
        Add a section
      </AddButton>
    </div>
  )
}

/** Free-form mode still needs numbers - these become the card's proof points. */
export function MetricEditor({
  value,
  onChange,
}: {
  value: Array<{ label: string; value: string }>
  onChange: (metrics: Array<{ label: string; value: string }>) => void
}) {
  function patch(index: number, part: Partial<{ label: string; value: string }>) {
    onChange(value.map((metric, i) => (i === index ? { ...metric, ...part } : metric)))
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-display text-sm font-medium text-ink">Results</p>
        <p className="mt-1 text-xs text-muted">
          The first one becomes the number on your card. Keep it to what you can defend.
        </p>
      </div>

      {value.map((metric, index) => (
        <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <input
            className={`${CONTROL} sm:w-48`}
            value={metric.label}
            placeholder="Label (Throughput)"
            aria-label={`Result ${index + 1} label`}
            onChange={(event) => patch(index, { label: event.target.value })}
          />
          <input
            className={CONTROL}
            value={metric.value}
            placeholder="9 → 26 reviews per hour"
            aria-label={`Result ${index + 1} value`}
            onChange={(event) => patch(index, { value: event.target.value })}
          />
          <RemoveButton
            label={`Remove result ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          />
        </div>
      ))}

      <AddButton onClick={() => onChange([...value, { label: "", value: "" }])}>
        Add a result
      </AddButton>
    </div>
  )
}
