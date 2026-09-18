/**
 * Per-route document head, hand-rolled.
 *
 * Two jobs. A crawler needs a distinct `<title>`, description and canonical
 * per URL or every page looks like the same page - the problem path routing
 * was introduced to fix, half-solved if the metadata stays static. And a
 * person pasting their case study into Slack needs an Open Graph card, because
 * a bare link is the difference between a share that earns a click and one
 * that gets ignored. That share is this product's only organic growth loop.
 *
 * No dependency: rule 1. This edits the tags directly, which is all a helmet
 * library does.
 */

const SITE_NAME = "whoareyou"
const DEFAULT_TITLE = "whoareyou - the directory for people who build tech"
const DEFAULT_DESCRIPTION =
  "A segmented portfolio directory for designers, developers, product people and DevOps. Every entry states the problem, the decisions, and the number that changed."

export interface PageMeta {
  title?: string
  description?: string
  /** Absolute or root-relative; resolved against the current origin. */
  image?: string
  /** `article` for a case study, `profile` for a person, `website` otherwise. */
  type?: "website" | "article" | "profile"
  /** Keep a page out of the index: a panel, the console, a 404. */
  noindex?: boolean
}

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement("meta")
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute("content", content)
}

function setLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!tag) {
    tag = document.createElement("link")
    tag.setAttribute("rel", rel)
    document.head.appendChild(tag)
  }
  tag.setAttribute("href", href)
}

export function applyMeta(meta: PageMeta): void {
  const title = meta.title ? `${meta.title} - ${SITE_NAME}` : DEFAULT_TITLE
  const description = meta.description ?? DEFAULT_DESCRIPTION
  const url = `${window.location.origin}${window.location.pathname}`
  const image = meta.image
    ? new URL(meta.image, window.location.origin).toString()
    : `${window.location.origin}/og-default.svg`

  document.title = title
  setMeta('meta[name="description"]', "name", "description", description)

  // Canonical, so a stray query string does not read as a second page.
  setLink("canonical", url)

  setMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME)
  setMeta('meta[property="og:title"]', "property", "og:title", title)
  setMeta('meta[property="og:description"]', "property", "og:description", description)
  setMeta('meta[property="og:type"]', "property", "og:type", meta.type ?? "website")
  setMeta('meta[property="og:url"]', "property", "og:url", url)
  setMeta('meta[property="og:image"]', "property", "og:image", image)

  setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image")
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", title)
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", description)
  setMeta('meta[name="twitter:image"]', "name", "twitter:image", image)

  // The panel, the console and a 404 have nothing to offer a search result.
  const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (meta.noindex) {
    setMeta('meta[name="robots"]', "name", "robots", "noindex, nofollow")
  } else if (robots) {
    robots.remove()
  }
}

/** Trimmed to roughly what a search result and a social card will show. */
export function clamp(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}
