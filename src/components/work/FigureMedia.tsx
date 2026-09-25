import type { WorkFigure } from "@/data/work"
import { parseVideoUrl } from "@/lib/video"
import { Play } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

interface FigureMediaProps {
  figure: WorkFigure
  className?: string
  loading?: "eager" | "lazy"
}

/**
 * The one place that decides how a figure actually renders - an uploaded
 * image, or an embedded video for a figure whose `kind` is `"video"`.
 *
 * `WorkFigures` and `FigureSlider` both render figures without knowing what
 * kind either one is; this is the seam that keeps it that way, so a third
 * media kind is one branch here rather than a change in two layouts.
 */
export function FigureMedia({ figure, className, loading = "lazy" }: FigureMediaProps) {
  if (figure.kind === "video") {
    const parsed = parseVideoUrl(figure.src)

    if (!parsed) {
      // A host this does not recognise cannot be vetted for what it runs once
      // it is embedded on this page, so it stays a link rather than a frame.
      return (
        <a
          href={figure.src}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            "flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-paper-2 font-display text-sm font-medium text-ink-2 transition-colors duration-200 hover:border-ink/30 hover:text-ink",
            className,
          )}
        >
          <Play size={22} />
          Watch the video
        </a>
      )
    }

    return (
      <iframe
        src={parsed.embedUrl}
        title={figure.alt || "Embedded video"}
        loading={loading}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className={cn("aspect-video w-full rounded-2xl border border-line bg-ink", className)}
      />
    )
  }

  return (
    <img
      src={figure.src}
      alt={figure.alt}
      width={figure.width}
      height={figure.height}
      loading={loading}
      decoding="async"
      className={className}
    />
  )
}
