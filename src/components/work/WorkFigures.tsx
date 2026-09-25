import { useCallback, useEffect, useState } from "react"
import type { WorkFigure } from "@/data/work"
import { layoutFor, shapeOf } from "@/lib/figures"
import { FigureSlider } from "./FigureSlider"
import { FigureMedia } from "./FigureMedia"
import { Close } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

interface WorkFiguresProps {
  figures: readonly WorkFigure[]
  /** Previews in the editor are not clickable; the published page is. */
  zoomable?: boolean
}

/**
 * Figures inside a case study.
 *
 * Four layouts, chosen from the images themselves rather than from an author's
 * layout preference - a wide screenshot gets the full column, a phone screen
 * gets a narrow one with its caption alongside, a pair sits side by side
 * because a pair is almost always a before/after, and three or more become a
 * grid. Authors choose what to show; the page decides how, which is the only
 * way a hundred case studies stay comparable to a reader.
 */
export function WorkFigures({ figures, zoomable = true }: WorkFiguresProps) {
  const [zoomed, setZoomed] = useState<WorkFigure | null>(null)
  if (figures.length === 0) return null

  const layout = layoutFor(figures)

  if (layout === "slider") {
    return (
      <>
        <FigureSlider figures={figures} onZoom={zoomable ? setZoomed : undefined} />
        {zoomed && <Lightbox figure={zoomed} onClose={() => setZoomed(null)} />}
      </>
    )
  }

  return (
    <>
      <div
        className={cn(
          "mt-6",
          layout === "pair" && "grid gap-4 sm:grid-cols-2",
          layout === "grid" && "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
          layout === "tall" && "flex flex-col gap-5 lg:flex-row lg:items-start",
        )}
      >
        {figures.map((figure, index) => (
          <Figure
            key={`${figure.src.slice(-24)}-${index}`}
            figure={figure}
            layout={layout}
            // A video is already the interactive thing; zooming an iframe
            // buys nothing and a button cannot wrap one without breaking its
            // own controls.
            onZoom={zoomable && figure.kind !== "video" ? () => setZoomed(figure) : undefined}
          />
        ))}
      </div>

      {zoomed && <Lightbox figure={zoomed} onClose={() => setZoomed(null)} />}
    </>
  )
}

function Figure({
  figure,
  layout,
  onZoom,
}: {
  figure: WorkFigure
  layout: ReturnType<typeof layoutFor>
  onZoom?: () => void
}) {
  const tall = layout === "tall"

  const image = (
    <FigureMedia
      figure={figure}
      loading="lazy"
      className={cn(
        "w-full rounded-2xl border border-line bg-paper-2 object-cover",
        // A single square image at full column width is a lot of nothing;
        // capping it keeps the reading measure intact.
        layout === "square" && "max-w-lg",
      )}
    />
  )

  return (
    <figure className={cn("min-w-0", tall && "flex flex-col gap-5 lg:flex-row lg:items-start")}>
      <div className={cn(tall && "w-full shrink-0 lg:max-w-[16rem]")}>
        {onZoom ? (
          <button
            type="button"
            onClick={onZoom}
            className="group block w-full cursor-zoom-in overflow-hidden rounded-2xl"
          >
            {image}
            <span className="sr-only">Enlarge: {figure.alt}</span>
          </button>
        ) : (
          image
        )}
      </div>

      <figcaption
        className={cn(
          "text-sm leading-relaxed text-muted",
          tall ? "lg:flex-1 lg:pt-1" : "mt-3",
        )}
      >
        {figure.caption}
      </figcaption>
    </figure>
  )
}

/**
 * A 1400px screenshot shown at 640px is unreadable, which defeats the point of
 * including it. Escape closes, the backdrop closes, and focus goes to the
 * close button so a keyboard user is never trapped behind an image.
 */
function Lightbox({ figure, onClose }: { figure: WorkFigure; onClose: () => void }) {
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onKeyDown])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={figure.alt}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/90 p-4 sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        autoFocus
        className="absolute top-4 right-4 grid size-11 cursor-pointer place-items-center rounded-pill text-paper/70 transition-colors duration-200 hover:bg-paper/10 hover:text-paper"
      >
        <Close />
      </button>

      <img
        src={figure.src}
        alt={figure.alt}
        className="max-h-[78vh] max-w-full rounded-2xl object-contain"
      />
      <p className="max-w-2xl text-center text-sm leading-relaxed text-paper/75">{figure.caption}</p>

      {/* Click-away sits behind the content so the image itself is not a target. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 -z-10 cursor-zoom-out"
      />
    </div>
  )
}

export { shapeOf }
