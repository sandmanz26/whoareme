import { useState } from "react"
import { cn, initialsOf, pickBy } from "@/lib/utils"

const FALLBACK_TINTS = [
  "bg-pop-lime text-ink",
  "bg-pop-pink text-ink",
  "bg-pop-violet text-paper",
  "bg-pop-sky text-ink",
  "bg-pop-tangerine text-ink",
] as const

interface AvatarProps {
  /** Omit (or pass empty) to render the monogram directly - no broken-image flash. */
  src?: string
  name: string
  className?: string
  /** Decorative avatars (hero orbit) should not be announced. */
  decorative?: boolean
}

/**
 * Portrait with a graceful degradation path: if the remote photo fails
 * (offline, blocked, 404) we render a deterministic pop-tinted monogram
 * instead of a broken image. Same person always gets the same tint.
 */
export function Avatar({ src, name, className, decorative = false }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const tint = pickBy(FALLBACK_TINTS, name)

  if (failed || !src) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center font-display text-[0.9em] font-bold tracking-tight",
          tint,
          className,
        )}
        aria-hidden={decorative || undefined}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : name}
      >
        {initialsOf(name)}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={decorative ? "" : `Portrait of ${name}`}
      aria-hidden={decorative || undefined}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  )
}
