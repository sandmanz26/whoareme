const THUMBNAIL_EDGE = 960
const FIGURE_EDGE = 1400
/**
 * A portrait is never rendered larger than about 112px, and it sits in the
 * same `localStorage` budget as every draft the person has written. Storing a
 * 960px avatar would spend the entry budget on a picture of a face.
 */
const AVATAR_EDGE = 320
const QUALITY = 0.72

/** Browsers give roughly 5MB per origin; leave headroom for the rest of the app. */
export const STORAGE_BUDGET_BYTES = 4_000_000

interface Decoded {
  dataUrl: string
  width: number
  height: number
}

function decode(file: File, maxEdge: number): Promise<Decoded> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("That file is not an image."))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read that file."))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error("Could not decode that image."))
      image.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)

        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("Canvas is unavailable in this browser."))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", QUALITY),
          width: canvas.width,
          height: canvas.height,
        })
      }
      image.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Cover thumbnail. Small, because it is only ever rendered at card size.
 */
export async function fileToThumbnail(file: File): Promise<string> {
  return (await decode(file, THUMBNAIL_EDGE)).dataUrl
}

/** Profile portrait. Small on purpose; see AVATAR_EDGE. */
export async function fileToAvatar(file: File): Promise<string> {
  return (await decode(file, AVATAR_EDGE)).dataUrl
}

/**
 * A figure inside a case study. Larger than a thumbnail because a screenshot
 * has to stay readable when it is opened, and the intrinsic dimensions come
 * back with it - layout is chosen from the aspect ratio, so it has to be known
 * before the image is rendered or the page reflows as each one loads.
 */
export async function fileToFigure(file: File): Promise<Decoded> {
  return decode(file, FIGURE_EDGE)
}

/** Rough byte size of a base64 data URL, for the storage meter. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
  return Math.round(base64.length * 0.75)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
