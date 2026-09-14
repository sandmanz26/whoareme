import { useRef, useState } from "react"
import { WorkCover } from "@/components/work/WorkCover"
import { Trash, Upload } from "@/components/ui/Icon"
import { fileToThumbnail } from "@/lib/image"
import type { RoleId } from "@/data/taxonomy"

interface ThumbnailPickerProps {
  value?: string
  seed: string
  role: RoleId
  metric?: string
  onChange: (thumbnail: string | undefined) => void
}

/**
 * Optional upload with a generated cover as the default - not the other way
 * round. Plenty of real work is under NDA or is a terminal screen nobody can
 * read at card size, so an entry must never be penalised for having no picture.
 */
export function ThumbnailPicker({ value, seed, role, metric, onChange }: ThumbnailPickerProps) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      onChange(await fileToThumbnail(file))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not use that image.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-display text-sm font-medium text-ink">Thumbnail</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-line sm:w-56">
          {value ? (
            <img src={value} alt="Selected thumbnail" className="aspect-[16/9] w-full object-cover" />
          ) : (
            <WorkCover
              seed={seed}
              role={role}
              metric={metric || "Your headline result"}
              metricLabel={metric ? undefined : "Generated cover"}
              className="aspect-[16/9] w-full"
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-ink/15 bg-card px-4 py-2.5 font-display text-sm font-medium text-ink transition-colors duration-200 hover:border-ink disabled:opacity-50"
            >
              <Upload size={15} />
              {busy ? "Processing…" : value ? "Replace image" : "Upload image"}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-4 py-2.5 font-display text-sm font-medium text-muted transition-colors duration-200 hover:text-pop-pink"
              >
                <Trash size={15} />
                Use generated cover
              </button>
            )}
          </div>

          <p className="max-w-sm text-xs leading-relaxed text-muted">
            Optional. Images are downscaled to 960px and stored in this browser only. Leave it
            empty and the cover is drawn from your craft and headline number.
          </p>
          {error && (
            <p role="alert" className="text-xs font-medium text-pop-pink">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  )
}
