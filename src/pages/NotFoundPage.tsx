import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"
import { ArrowRight } from "@/components/ui/Icon"
import { applyMeta } from "@/lib/head"

export function NotFoundPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    return applyMeta({
      title: "Page not found",
      description: "Nothing lives at that address.",
      noindex: true,
    })
  }, [])

  return (
    <Container className="flex min-h-[70vh] max-w-xl flex-col justify-center py-20">
      <p className="eyebrow">404</p>
      <h1 className="display mt-3 text-[clamp(2rem,6vw,3.25rem)]">Nothing lives at that address</h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        <code className="rounded bg-paper-2 px-1.5 py-0.5 text-sm">{pathname}</code> is not a page
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
