import type { RoleId } from "./taxonomy"

/**
 * Where a person can be found outside this directory.
 *
 * Kept deliberately small. A profile with nine icons says nothing; the point
 * is the two or three places a reviewer would actually open, and which ones
 * those are depends on the craft - a developer's GitHub carries weight that
 * their Instagram does not, and for a designer it is the other way round.
 */
export const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "github", label: "GitHub" },
  { id: "dribbble", label: "Dribbble" },
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "website", label: "Personal site" },
] as const

export type PlatformId = (typeof PLATFORMS)[number]["id"]

export interface PersonLink {
  platform: PlatformId
  href: string
  /** The @handle or domain, shown as the accessible name and on hover. */
  handle: string
}

export function platformById(id: PlatformId) {
  return PLATFORMS.find((platform) => platform.id === id)!
}

/**
 * Which platforms a craft is actually judged on. Seeded profiles get these;
 * a real signup states their own.
 */
const ROLE_PLATFORMS: Record<RoleId, PlatformId[]> = {
  engineering: ["github", "linkedin", "website"],
  infra: ["github", "linkedin"],
  data: ["github", "linkedin", "website"],
  quality: ["github", "linkedin"],
  design: ["dribbble", "linkedin", "instagram"],
  research: ["linkedin", "website"],
  product: ["linkedin", "x"],
  growth: ["linkedin", "x", "instagram"],
}

/**
 * Seeded hrefs point at `example.com`, the domain IANA reserves for exactly
 * this. Pointing fixture profiles at a real `github.com/<handle>` would hang a
 * fictional person off whatever real account happens to hold that name.
 */
function hrefFor(platform: PlatformId, handle: string): string {
  return platform === "website"
    ? `https://example.com/${handle}`
    : `https://example.com/${platform}/${handle}`
}

function handleFor(platform: PlatformId, slug: string): string {
  if (platform === "website") return `${slug.replace(/-/g, "")}.dev`
  return `@${slug.replace(/-/g, "")}`
}

/** Deterministic, so a person's links never reshuffle between renders. */
export function linksFor(role: RoleId, slug: string): PersonLink[] {
  return ROLE_PLATFORMS[role].map((platform) => ({
    platform,
    handle: handleFor(platform, slug),
    href: hrefFor(platform, handleFor(platform, slug).replace(/^@/, "")),
  }))
}
