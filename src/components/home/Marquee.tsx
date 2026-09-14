import type { CSSVars } from "@/lib/css"

const WORDS = [
  "design systems",
  "platform engineering",
  "applied AI",
  "payments",
  "developer experience",
  "data products",
  "zero-to-one",
  "staff+ ICs",
  "design ops",
  "site reliability",
]

/**
 * Editorial ticker. The word list is duplicated once and the track slides
 * exactly -50%, which makes the loop seamless without measuring anything.
 */
export function Marquee() {
  return (
    <div className="border-y border-line bg-ink py-4 text-paper">
      <div className="flex overflow-hidden" aria-hidden="true">
        <div
          className="marquee-track flex shrink-0 items-center gap-8 pr-8"
          style={{ "--marquee-duration": "44s" } as CSSVars}
        >
          {[...WORDS, ...WORDS].map((word, index) => (
            <span key={`${word}-${index}`} className="flex shrink-0 items-center gap-8">
              <span className="font-display text-sm font-medium tracking-[0.02em] whitespace-nowrap">
                {word}
              </span>
              <span className="size-1.5 shrink-0 rounded-full bg-pop-lime" />
            </span>
          ))}
        </div>
      </div>
      <span className="sr-only">Popular specialisms in the directory.</span>
    </div>
  )
}
