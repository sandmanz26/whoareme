import { Container } from "@/components/layout/Container"

/** A quiet placeholder for the moment between a route opening and its data. */
export function RouteLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <Container className="flex min-h-[50vh] items-center justify-center py-24">
      <p role="status" className="text-sm text-muted">
        {label}
      </p>
    </Container>
  )
}
