const MAX_EDGE = 960
const QUALITY = 0.72

/**
 * Reads an image file and returns a downscaled JPEG data URL.
 *
 * Thumbnails live in localStorage alongside the entry, and localStorage is a
 * ~5MB budget for the whole app - so a 6MB camera JPEG has to become ~80KB
 * before it is allowed anywhere near storage.
 */
export function fileToThumbnail(file: File): Promise<string> {
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
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)

        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("Canvas is unavailable in this browser."))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", QUALITY))
      }
      image.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
