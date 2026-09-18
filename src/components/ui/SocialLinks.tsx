import { platformById, type PersonLink } from "@/data/platforms"
import { BrandIcon } from "./BrandIcon"
import { cn } from "@/lib/utils"

interface SocialLinksProps {
  links: readonly PersonLink[]
  /** `compact` for the sidebar card, `full` for a profile header. */
  size?: "compact" | "full"
  className?: string
  /** Names the owner, so screen readers do not hear "GitHub" eleven times on a page. */
  ownerName: string
}

/**
 * Icon-only by design: the row sits under a name that already says whose it
 * is, and a label per platform would double the height of the card for no
 * information. The accessible name still carries the platform and the owner.
 */
export function SocialLinks({ links, size = "compact", className, ownerName }: SocialLinksProps) {
  if (links.length === 0) return null

  const compact = size === "compact"

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {links.map((link) => {
        const platform = platformById(link.platform)
        return (
          <li key={link.platform}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              title={`${platform.label} · ${link.handle}`}
              className={cn(
                "grid place-items-center rounded-pill border border-line bg-card text-ink-2",
                "transition-all duration-200 ease-pop",
                "hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-paper",
                // Clears the 44px touch target at `full`; the sidebar card
                // keeps a tighter 36px because it sits inside dense metadata.
                compact ? "size-9" : "size-11",
              )}
            >
              <BrandIcon platform={link.platform} size={compact ? 16 : 18} />
              <span className="sr-only">
                {ownerName} on {platform.label}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
