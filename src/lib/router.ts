import { useEffect, useState } from "react"

export interface Route {
  /** Always normalised to a leading slash, e.g. "/panel/portfolio". */
  path: string
  segments: string[]
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, "")
  const path = raw.startsWith("/") ? raw : `/${raw}`
  return { path, segments: path.split("/").filter(Boolean) }
}

/**
 * Hash routing, hand-rolled.
 *
 * The app is static and deploys anywhere, so there is no server to rewrite
 * paths. In-page anchors (`#roles`) simply parse to a route nothing matches,
 * which falls through to the home page - so jump links keep working.
 */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])

  return route
}

export function navigate(path: string): void {
  if (window.location.hash === `#${path}`) return
  window.location.hash = path
}

export const PAGE_ROUTES = ["panel", "work", "people", "about", "changelog", "privacy"] as const
export type PageRoot = (typeof PAGE_ROUTES)[number] | "home"

export function pageRootOf(route: Route): PageRoot {
  const first = route.segments[0]
  return (PAGE_ROUTES as readonly string[]).includes(first) ? (first as PageRoot) : "home"
}
