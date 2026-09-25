/**
 * Turning a link someone actually pastes into something that plays.
 *
 * An author has a YouTube watch link, a Vimeo share link or a Loom share
 * link - never the embeddable form, because nobody copies that by hand. This
 * recognises the handful of hosts a portfolio realistically links to and
 * rewrites each into its embed URL.
 *
 * Everything else is deliberately left unrecognised rather than embedded
 * anyway. An `<iframe>` runs whatever that host serves, on this page, with no
 * way to vet it in advance - so an unrecognised link stays a link, not a
 * frame.
 */

export type VideoProvider = "youtube" | "vimeo" | "loom"

export interface ParsedVideo {
  provider: VideoProvider
  /** Safe to drop straight into an <iframe src>. */
  embedUrl: string
}

export const VIDEO_PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  loom: "Loom",
}

function hostOf(raw: string): { host: string; url: URL } | null {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    return { host: url.hostname.replace(/^www\./, "").toLowerCase(), url }
  } catch {
    return null
  }
}

export function parseVideoUrl(raw: string): ParsedVideo | null {
  const parsed = hostOf(raw)
  if (!parsed) return null
  const { host, url } = parsed

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")
          ? url.pathname.split("/")[2]
          : null
    return id ? { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0]
    return id ? { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part))
    return id ? { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` } : null
  }

  if (host === "loom.com") {
    const segments = url.pathname.split("/").filter(Boolean)
    const id = segments[0] === "share" || segments[0] === "embed" ? segments[1] : undefined
    return id ? { provider: "loom", embedUrl: `https://www.loom.com/embed/${id}` } : null
  }

  return null
}

/** A thumbnail for the editor's list view, where one is free to ask for. */
export function videoThumbnail(raw: string): string | null {
  const parsed = parseVideoUrl(raw)
  if (parsed?.provider !== "youtube") return null
  const id = parsed.embedUrl.split("/").pop()
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}
