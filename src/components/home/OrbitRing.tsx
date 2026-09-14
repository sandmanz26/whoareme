import { Avatar } from "@/components/ui/Avatar"
import type { Person } from "@/data/people"
import type { CSSVars } from "@/lib/css"
import { cn, pickBy } from "@/lib/utils"

/**
 * Decorative portraits get a duotone treatment: a pop-coloured tile with the
 * photo blended in luminosity mode. It unifies wildly different source photos
 * into one art direction - and keeps the hero graphic rather than stocky.
 * Directory cards deliberately stay full colour: that's information, not decor.
 */
const TINTS = [
  "bg-pop-lime",
  "bg-pop-pink",
  null, // a few tiles stay plain greyscale so the ring reads restrained
  "bg-pop-violet",
  "bg-pop-sky",
  null,
  "bg-pop-tangerine",
] as const

function tintOf(seed: string) {
  return pickBy(TINTS, seed)
}

interface OrbitRingProps {
  people: Person[]
  /** Radius and portrait size as a fraction of the stage, so the ring scales with the viewport. */
  radiusRatio: number
  slotRatio: number
  durationSeconds: number
  direction?: "cw" | "ccw"
}

/**
 * One revolving ring of portraits.
 *
 * The ring element rotates; every portrait counter-rotates at the exact same
 * rate, so faces stay upright while travelling the circle. Positions are pure
 * CSS transforms - no per-frame JavaScript, so it costs nothing on the main
 * thread and stops entirely under `prefers-reduced-motion`.
 */
export function OrbitRing({
  people,
  radiusRatio,
  slotRatio,
  durationSeconds,
  direction = "cw",
}: OrbitRingProps) {
  const ringStyle: CSSVars = {
    "--orbit-duration": `${durationSeconds}s`,
    "--orbit-radius": `calc(var(--stage) * ${radiusRatio})`,
    "--slot-size": `calc(var(--stage) * ${slotRatio})`,
  }

  return (
    <div className="orbit-ring" data-direction={direction} style={ringStyle} aria-hidden="true">
      {people.map((person, index) => (
        <div
          key={person.id}
          className="orbit-slot"
          style={{ "--angle": `${(index * 360) / people.length}deg` } as CSSVars}
        >
          <div className="orbit-upright">
            <div className="relative isolate size-full overflow-hidden rounded-[28%] border border-ink/10 bg-paper-2 shadow-[0_12px_32px_-14px_rgba(11,11,15,0.45)]">
              <Avatar
                src={person.photo}
                name={person.name}
                decorative
                className="size-full grayscale contrast-105"
              />
              {tintOf(person.id) && (
                <span
                  className={cn("absolute inset-0 mix-blend-color opacity-70", tintOf(person.id))}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
