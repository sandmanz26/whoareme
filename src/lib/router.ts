import { useEffect, useState } from "react"

export interface Route {
  /** Always normalised to a leading slash, e.g. "/panel/portfolio". */
  path: string
  segments: string[]
}

function parse(pathname: string): Route {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`
  // A trailing slash and no trailing slash are the same page, not two.
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path
  return { path: clean, segments: clean.split("/").filter(Boolean) }
}

/**
 * Fired by `navigate()`. `pushState` emits no event of its own, so without
 * this only the component that called it would re-render.
 */
const ROUTE_EVENT = "whoareyou:route"

/**
 * Path routing over the History API.
 *
 * This was a hash router, chosen so the static build could be dropped on any
 * host with no rewrite rule. That convenience cost the product its main
 * promise: a fragment is never sent to the server, and search engines collapse
 * every `#/work/slug` into one URL - so no case study could be indexed and
 * "get found for the work you actually do" could not happen.
 *
 * The price is that the host must serve `index.html` for unknown paths.
 * `public/_redirects` and `vercel.json` cover the common cases; anything else
 * is one line of config, which is the right trade for being findable.
 */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.pathname))

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.pathname))
    // popstate covers back and forward; the custom event covers pushState.
    window.addEventListener("popstate", onChange)
    window.addEventListener(ROUTE_EVENT, onChange)
    return () => {
      window.removeEventListener("popstate", onChange)
      window.removeEventListener(ROUTE_EVENT, onChange)
    }
  }, [])

  return route
}

export function navigate(path: string): void {
  const [pathname, hash] = path.split("#")
  const target = pathname || window.location.pathname

  if (target !== window.location.pathname) {
    window.history.pushState(null, "", hash ? `${target}#${hash}` : target)
    window.dispatchEvent(new Event(ROUTE_EVENT))
  }

  // An anchor on the destination page: scroll once the route has rendered.
  if (hash) {
    window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }
}

/**
 * Turns real `<a href="/...">` links into client-side navigation.
 *
 * Anchors rather than buttons, so a link behaves like a link: middle-click
 * opens a tab, the status bar shows the destination, and a crawler can follow
 * it. Modified clicks and external hosts are deliberately left alone.
 */
export function interceptLinkClicks(): () => void {
  function onClick(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const anchor = (event.target as HTMLElement | null)?.closest("a")
    if (!anchor) return
    if (anchor.target === "_blank" || anchor.hasAttribute("download")) return

    const href = anchor.getAttribute("href")
    if (!href || !href.startsWith("/")) return

    event.preventDefault()
    navigate(href)
  }

  document.addEventListener("click", onClick)
  return () => document.removeEventListener("click", onClick)
}

export const PAGE_ROUTES = [
  "panel",
  "work",
  "people",
  "about",
  "changelog",
  "privacy",
  "admin",
  "signin",
  "reset",
  "terms",
  "content-policy",
  "accessibility",
] as const
export type PageRoot = (typeof PAGE_ROUTES)[number] | "home" | "notFound"

/**
 * `"home"` for `/`, `"notFound"` for anything unrecognised.
 *
 * Unknown paths used to fall through to the home page. That is wrong twice
 * over: someone who mistypes a URL is told nothing, and a crawler sees every
 * broken link as another copy of the front page.
 */
export function pageRootOf(route: Route): PageRoot {
  const first = route.segments[0]
  if (!first) return "home"
  return (PAGE_ROUTES as readonly string[]).includes(first) ? (first as PageRoot) : "notFound"
}
