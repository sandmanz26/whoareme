import { WorkCard } from "@/components/work/WorkCard"
import { PublishReadiness } from "./PublishReadiness"
import type { ReadinessItem } from "@/lib/readiness"
import type { Work } from "@/data/work"
import type { Author } from "@/lib/authors"

export function WorkEditorAside({
  readiness,
  published,
  preview,
  author,
}: {
  readiness: ReadinessItem[]
  published: boolean
  preview: Work
  author: Author
}) {
  return (
    <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-24 xl:self-start">
      <PublishReadiness items={readiness} published={published} />

      <div>
        <p className="eyebrow">Preview</p>
        <div className="mt-4 flex min-w-0">
          <WorkCard work={preview} author={author} index={0} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Without an upload the cover is drawn from your craft and headline result - so an entry
          under NDA is never penalised for having no screenshot.
        </p>
      </div>
    </aside>
  )
}
