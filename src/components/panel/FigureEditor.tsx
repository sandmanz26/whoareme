import { useMemo, useRef, useState } from "react"
import type { WorkFigure } from "@/data/work"
import { WorkFigures } from "@/components/work/WorkFigures"
import { ChevronDown, Plus, Trash, Upload, Video } from "@/components/ui/Icon"
import { dataUrlBytes, fileToFigure, formatBytes, STORAGE_BUDGET_BYTES } from "@/lib/image"
import { layoutFor, ratioLabel, SHAPE_LABEL, shapeOf } from "@/lib/figures"
import { parseVideoUrl, videoThumbnail, VIDEO_PROVIDER_LABEL } from "@/lib/video"
import { cn } from "@/lib/utils"

const MAX_FIGURES = 6

const LAYOUT_EXPLAINER: Record<ReturnType<typeof layoutFor>, string> = {
  wide: "Full width - room for a dashboard or a wide table.",
  tall: "Narrow, with the caption alongside. Right for a phone screen.",
  square: "Inset and centred, capped so it does not swamp the text.",
  pair: "Side by side, because two figures under one heading is a before and after.",
  grid: "A grid - three or more reads as a set.",
  slider:
    "One at a time, stepped through. Right for a sequence, wrong for evidence meant to be compared.",
}

interface FigureEditorProps {
  figures: WorkFigure[]
  /** Chapter names this entry actually has, so a figure cannot be orphaned. */
  sections: Array<{ value: string; label: string }>
  /** Everything else already stored for this entry, for the budget meter. */
  otherBytes: number
  onChange: (figures: WorkFigure[]) => void
  error?: string
}

/**
 * Uploading is the easy half. The hard half is that an image - or a video -
 * with no caption is decoration, and this product exists to stop decoration
 * winning. So alt text and a caption are required fields, not optional
 * polish, and the editor says why rather than just marking them with an
 * asterisk.
 *
 * A video is a link, not an upload: paste a YouTube, Vimeo or Loom share link
 * and it plays in place, at a fixed 16:9, mixed into the same chapters and
 * the same layouts as the photos - a design system with three screenshots and
 * a two-minute walkthrough reads as one gallery, not two separate things.
 *
 * The layout is not an author choice. It is derived from what was added,
 * shown back as a live preview, so the author can see what adding one more
 * will do before they add it.
 */
export function FigureEditor({
  figures,
  sections,
  otherBytes,
  onChange,
  error,
}: FigureEditorProps) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState("")
  const [videoError, setVideoError] = useState<string | null>(null)

  const usedBytes = useMemo(
    () => otherBytes + figures.reduce((total, figure) => total + dataUrlBytes(figure.src), 0),
    [figures, otherBytes],
  )
  const percent = Math.min(100, Math.round((usedBytes / STORAGE_BUDGET_BYTES) * 100))
  const full = figures.length >= MAX_FIGURES

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setUploadError(null)
    setBusy(true)

    const room = MAX_FIGURES - figures.length
    const accepted: WorkFigure[] = []
    let running = usedBytes

    try {
      for (const file of Array.from(files).slice(0, room)) {
        const decoded = await fileToFigure(file)
        const bytes = dataUrlBytes(decoded.dataUrl)
        if (running + bytes > STORAGE_BUDGET_BYTES) {
          setUploadError(
            "That would exceed what this browser will store. Remove a figure, or use a smaller image.",
          )
          break
        }
        running += bytes
        accepted.push({
          src: decoded.dataUrl,
          width: decoded.width,
          height: decoded.height,
          alt: "",
          caption: "",
          section: sections[0]?.value ?? "problem",
        })
      }
      if (accepted.length > 0) onChange([...figures, ...accepted])
      if (files.length > room) {
        setUploadError(`Six figures is the maximum. ${files.length - room} were not added.`)
      }
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Could not use that image.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  /**
   * A link, not an upload - so it needs no downscaling and costs the storage
   * budget almost nothing. Stored at a fixed 16:9: there is no image to read
   * real dimensions from, and every provider this embeds actually is 16:9.
   */
  function addVideo() {
    const trimmed = videoUrl.trim()
    if (!trimmed) return
    if (full) return

    let url: URL
    try {
      url = new URL(trimmed)
    } catch {
      setVideoError("That does not look like a URL.")
      return
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      setVideoError("That does not look like a URL.")
      return
    }

    setVideoError(null)
    onChange([
      ...figures,
      {
        kind: "video",
        src: trimmed,
        width: 1920,
        height: 1080,
        alt: "",
        caption: "",
        section: sections[0]?.value ?? "problem",
      },
    ])
    setVideoUrl("")
  }

  function patch(index: number, part: Partial<WorkFigure>) {
    onChange(figures.map((figure, i) => (i === index ? { ...figure, ...part } : figure)))
  }

  /** One toggle sets every figure in the chapter, so a group cannot disagree. */
  function setGroupDisplay(section: string, slider: boolean) {
    onChange(
      figures.map((figure) =>
        figure.section === section
          ? { ...figure, ...(slider ? { display: "slider" as const } : { display: undefined }) }
          : figure,
      ),
    )
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= figures.length) return
    const next = [...figures]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    onChange(next)
  }

  // Group by chapter so the preview shows the layout each chapter will get.
  const byChapter = sections
    .map((section) => ({
      section,
      items: figures.filter((figure) => figure.section === section.value),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex flex-col gap-5">
      {figures.length > 0 && (
        <ul className="flex flex-col gap-4">
          {figures.map((figure, index) => {
            const shape = shapeOf(figure)
            const video = figure.kind === "video" ? parseVideoUrl(figure.src) : null
            const thumb = figure.kind === "video" ? videoThumbnail(figure.src) : null
            return (
              <li
                key={`${index}-${figure.src.slice(-16)}`}
                className="rounded-2xl border border-line bg-paper p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="shrink-0">
                    {figure.kind === "video" ? (
                      <div className="relative h-24 w-40 overflow-hidden rounded-xl border border-line bg-ink">
                        {thumb && (
                          <img src={thumb} alt="" className="size-full object-cover opacity-70" />
                        )}
                        <span className="absolute inset-0 grid place-items-center text-paper">
                          <Video size={20} />
                        </span>
                      </div>
                    ) : (
                      <img
                        src={figure.src}
                        alt=""
                        className="h-24 w-40 rounded-xl border border-line object-cover"
                      />
                    )}
                    <p className="mt-1.5 font-display text-[0.6875rem] tracking-wide text-muted">
                      {figure.kind === "video"
                        ? video
                          ? VIDEO_PROVIDER_LABEL[video.provider]
                          : "Video link (opens in a new tab)"
                        : `${SHAPE_LABEL[shape]} · ${ratioLabel(figure)}`}
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <input
                      className={cn(CONTROL, !figure.alt.trim() && "border-pop-pink")}
                      value={figure.alt}
                      placeholder="Alt text - describe it for someone who cannot see it"
                      aria-label={`Figure ${index + 1} alt text`}
                      onChange={(event) => patch(index, { alt: event.target.value })}
                    />
                    <input
                      className={cn(CONTROL, !figure.caption.trim() && "border-pop-pink")}
                      value={figure.caption}
                      placeholder="Caption - what is this, and why is it here?"
                      aria-label={`Figure ${index + 1} caption`}
                      onChange={(event) => patch(index, { caption: event.target.value })}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`figure-section-${index}`}>
                        Figure {index + 1} chapter
                      </label>
                      <div className="relative">
                        <select
                          id={`figure-section-${index}`}
                          value={figure.section}
                          onChange={(event) => patch(index, { section: event.target.value })}
                          className={cn(CONTROL, "cursor-pointer appearance-none py-2 pr-9")}
                        >
                          {sections.map((section) => (
                            <option key={section.value} value={section.value}>
                              {section.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={14}
                          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
                        />
                      </div>

                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move figure ${index + 1} up`}
                          className="grid size-9 cursor-pointer place-items-center rounded-pill text-muted transition-colors duration-200 hover:text-ink disabled:opacity-25"
                        >
                          <ChevronDown size={15} className="rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === figures.length - 1}
                          aria-label={`Move figure ${index + 1} down`}
                          className="grid size-9 cursor-pointer place-items-center rounded-pill text-muted transition-colors duration-200 hover:text-ink disabled:opacity-25"
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onChange(figures.filter((_, i) => i !== index))}
                          aria-label={`Remove figure ${index + 1}`}
                          className="grid size-9 cursor-pointer place-items-center rounded-pill text-muted transition-colors duration-200 hover:text-pop-pink"
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy || full}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-ink/15 bg-card px-4 py-2.5 font-display text-sm font-medium text-ink transition-colors duration-200 hover:border-ink disabled:opacity-50"
        >
          {figures.length === 0 ? <Upload size={15} /> : <Plus size={15} />}
          {busy ? "Processing…" : figures.length === 0 ? "Add figures" : "Add another"}
        </button>
        <span className="font-display text-xs text-muted">
          {figures.length}/{MAX_FIGURES}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={videoUrl}
          disabled={full}
          onChange={(event) => {
            setVideoUrl(event.target.value)
            if (videoError) setVideoError(null)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addVideo()
            }
          }}
          placeholder="Or paste a YouTube, Vimeo or Loom link"
          aria-label="Video URL"
          className={cn(CONTROL, "min-w-[14rem] flex-1")}
        />
        <button
          type="button"
          onClick={addVideo}
          disabled={full || !videoUrl.trim()}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border border-ink/15 bg-card px-4 py-2.5 font-display text-sm font-medium text-ink transition-colors duration-200 hover:border-ink disabled:opacity-50"
        >
          <Video size={15} />
          Add video
        </button>
      </div>
      {videoError && (
        <p role="alert" className="text-xs font-medium text-pop-pink">
          {videoError}
        </p>
      )}

      {/* Storage is a real ceiling here, and silent quota failure is the worst
          possible outcome - so it is a visible meter rather than a surprise. */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Browser storage used by this entry</span>
          <span className={cn("font-display font-medium", percent > 85 && "text-pop-pink")}>
            {formatBytes(usedBytes)} / {formatBytes(STORAGE_BUDGET_BYTES)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-paper-2">
          <div
            className={cn(
              "h-full rounded-pill transition-[width] duration-300",
              percent > 85 ? "bg-pop-pink" : "bg-ink",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {uploadError && (
        <p role="alert" className="text-xs font-medium text-pop-pink">
          {uploadError}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-pop-pink">
          {error}
        </p>
      )}

      {byChapter.length > 0 && (
        <div className="rounded-2xl border border-dashed border-ink/20 p-4">
          <p className="eyebrow">Layout preview</p>
          <div className="mt-4 flex flex-col gap-6">
            {byChapter.map((group) => {
              const sliding = group.items.some((figure) => figure.display === "slider")
              return (
                <div key={group.section.value}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xs font-semibold tracking-tight text-ink">
                        {group.section.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {LAYOUT_EXPLAINER[layoutFor(group.items)]}
                      </p>
                    </div>

                    {/* Offered only where it is a real choice. One figure is
                        not a slider, and the default stays the grid. */}
                    {group.items.length > 1 && (
                      <div
                        role="group"
                        aria-label={`Layout for ${group.section.label}`}
                        className="flex shrink-0 items-center gap-1 rounded-pill border border-line bg-card p-1"
                      >
                        {([false, true] as const).map((wantSlider) => (
                          <button
                            key={String(wantSlider)}
                            type="button"
                            aria-pressed={sliding === wantSlider}
                            onClick={() => setGroupDisplay(group.section.value, wantSlider)}
                            className={cn(
                              "cursor-pointer rounded-pill px-3 py-1.5 font-display text-[0.6875rem] font-medium",
                              "transition-colors duration-200",
                              sliding === wantSlider
                                ? "bg-ink text-paper"
                                : "text-muted hover:text-ink",
                            )}
                          >
                            {wantSlider ? "Slider" : "Grid"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <WorkFigures figures={group.items} zoomable={false} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => addFiles(event.target.files)}
      />
    </div>
  )
}

const CONTROL =
  "w-full rounded-2xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink " +
  "transition-colors duration-200 placeholder:text-muted/70 focus:border-ink focus:outline-none"
