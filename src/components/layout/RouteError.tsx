import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"

/**
 * Route-level failure page. React Router hands a thrown error here instead of
 * unmounting the app, so a broken route is a page rather than a blank screen.
 */
export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
  const status = isRouteErrorResponse(error) ? error.status : null

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <h1 className="display text-3xl">
        {status === 404 ? "Page not found" : "Something went wrong"}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
        {status === 404
          ? "That page is not here. It may have moved."
          : "This page failed to load. Try again, or head back to the directory."}
      </p>
      <Button className="mt-7" onClick={() => navigate("/")}>
        Back to the directory
      </Button>
    </Container>
  )
}
