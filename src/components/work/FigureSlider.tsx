import { useCallback, useEffect, useRef, useState } from "react"
import type { WorkFigure } from "@/data/work"
import { ArrowRight } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

/**
 * A slider for a sequence of figures.
 *
 * Three rules, all of them from what goes wrong with carousels:
 *
 * 1. **It never auto-advances.** Auto-rotation is the single most complained
 *    about pattern on the web - it moves content out from under the reader and
 *    makes the control fight them.
 * 2. **Controls are always visible**, never revealed on hover, and there is a
 *    position counter - a reader who cannot see how many slides there are has
 *    no reason to look at the second one.
 * 3. **Scrolling is native.** CSS scroll-snap means swipe, trackpad and
 *    keyboard scrolling all work without being reimplemented, and the whole
 *    thing degrades to a plain scroller if the JS never runs.
 *
 * Because everything past slide one is effectively hidden, the editor offers
 * this as an opt-in for a sequence and keeps the grid as the default for
 * evidence a reader is meant to compare side by side.
 */
export function FigureSlider({
  figures,
  onZoom,
}: {
  figures: readonly WorkFigure[]
  onZoom?: (figure: WorkFigure) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const syncIndex = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const slideWidth = track.clientWidth
    setIndex(Math.round(track.scrollLeft / Math.max(1, slideWidth)))
  }, [])

  const goTo = useCallback((next: number) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(figures.length - 1, next))
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" })
  }, [figures.length])

  // Keep the counter honest when the viewport changes under a slid track.
  useEffect(() => {
    const onResize = () => syncIndex()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [syncIndex])

  const atStart = index === 0
  const atEnd = index === figures.length - 1

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`${figures.length} figures`}
      // min-w-0 or the track's content width propagates up through the flex
      // column and widens the whole page - see ENGINEERING.md invariant 1.
      className="mt-6 min-w-0"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); goTo(index + 1) }
        if (event.key === "ArrowLeft") { event.preventDefault(); goTo(index - 1) }
      }}
    >
      <div
        ref={trackRef}
        onScroll={syncIndex}
        tabIndex={0}
        className="no-scrollbar flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pop-violet"
      >
        {figures.map((figure, slide) => (
          <figure
            key={`${slide}-${figure.src.slice(-16)}`}
            // `relative` is load-bearing: the sr-only span inside is absolutely
            // positioned, and without a positioned ancestor its containing block
            // is the page, so it lands at the slide's off-screen static position
            // and widens the document past the track's clipping.
            className="relative w-full shrink-0 snap-center px-0.5"
            aria-roledescription="slide"
            aria-label={`${slide + 1} of ${figures.length}`}
            // Slides off-screen are reachable by scrolling, so they stay in
            // the accessibility tree rather than being hidden from it.
          >
            {onZoom ? (
              <button
                type="button"
                onClick={() => onZoom(figure)}
                className="relative block w-full cursor-zoom-in overflow-hidden rounded-2xl"
              >
                <img
                  src={figure.src}
                  alt={figure.alt}
                  width={figure.width}
                  height={figure.height}
                  loading={slide === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="max-h-[32rem] w-full rounded-2xl border border-line bg-paper-2 object-contain"
                />
                <span className="sr-only">Enlarge: {figure.alt}</span>
              </button>
            ) : (
              <img
                src={figure.src}
                alt={figure.alt}
                width={figure.width}
                height={figure.height}
                loading={slide === 0 ? "eager" : "lazy"}
                decoding="async"
                className="max-h-[32rem] w-full rounded-2xl border border-line bg-paper-2 object-contain"
              />
            )}
            <figcaption className="mt-3 min-h-[2.5rem] text-sm leading-relaxed text-muted">
              {figure.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={atStart}
          aria-label="Previous figure"
          className={CONTROL}
        >
          <ArrowRight size={16} className="rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={atEnd}
          aria-label="Next figure"
          className={CONTROL}
        >
          <ArrowRight size={16} />
        </button>

        <ul className="flex items-center gap-1.5">
          {figures.map((_, slide) => (
            <li key={slide}>
              <button
                type="button"
                onClick={() => goTo(slide)}
                aria-label={`Go to figure ${slide + 1}`}
                aria-current={slide === index ? "true" : undefined}
                className={cn(
                  "grid size-6 cursor-pointer place-items-center rounded-pill",
                  "transition-colors duration-200",
                )}
              >
                <span
                  className={cn(
                    "block size-1.5 rounded-full transition-all duration-200",
                    slide === index ? "w-4 bg-ink" : "bg-ink/25",
                  )}
                />
              </button>
            </li>
          ))}
        </ul>

        {/* The counter is the part that makes a reader believe there is a
            second slide worth reaching. */}
        <p aria-live="polite" className="ml-auto font-display text-xs font-medium text-muted">
          {index + 1} of {figures.length}
        </p>
      </div>
    </div>
  )
}

const CONTROL =
  "grid size-9 shrink-0 cursor-pointer place-items-center rounded-pill border border-line " +
  "bg-card text-ink transition-colors duration-200 hover:border-ink disabled:opacity-30 " +
  "disabled:hover:border-line"
