import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"
import { ArrowRight } from "@/components/ui/Icon"
import { navigate } from "@/lib/router"

/**
 * A real 404, rather than falling through to the home page.
 *
 * Silently serving the front page for an unknown path tells a person nothing
 * and tells a crawler that every broken link is another copy of the homepage,
 * which is how a small site accumulates duplicate-content problems.
 *
 * It offers the two destinations a lost visitor actually wants instead of only
 * a link home: most bad URLs here are a stale entry link or a renamed profile.
 */
export function NotFoundPage({ path }: { path: string }) {
  return (
    <Container className="flex min-h-[70vh] max-w-xl flex-col justify-center py-20">
      <p className="eyebrow">404</p>
      <h1 className="display mt-3 text-[clamp(2rem,6vw,3.25rem)]">
        Nothing lives at that address
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        <code className="rounded bg-paper-2 px-1.5 py-0.5 text-sm">{path}</code> is not a page
        here. Entries and profiles keep their addresses, so a link that used to work has usually
        been unpublished by its author rather than moved.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => navigate("/work")}>
          Browse the portfolios
          <ArrowRight size={16} />
        </Button>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to the directory
        </Button>
      </div>
    </Container>
  )
}
