import { useEffect, useRef, useState } from "react"

/**
 * Reveals an element the first time it enters the viewport.
 *
 * Defaults to revealed and only hides once we know an observer exists, so a
 * browser without IntersectionObserver - or a run where the effect never fires
 * - shows the content rather than a blank column. Content that depends on JS
 * to become visible is a bug waiting for a bad network.
 *
 * Disconnects after firing, so scrolling a long case study stays cheap.
 */
export function useReveal<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(() => typeof IntersectionObserver === "undefined")

  useEffect(() => {
    if (revealed) return
    const node = ref.current
    if (!node) return

    // Already in view on load (above the fold): reveal without waiting.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [revealed, rootMargin])

  return { ref, revealed }
}

/**
 * How far through the article the reader is, 0 to 1.
 *
 * A case study runs long by design, and a progress bar is the cheapest way to
 * tell someone the end is in sight. Reads on scroll through rAF so it never
 * does layout work more than once a frame.
 */
export function useReadingProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      const node = ref.current
      if (!node) return
      const { top, height } = node.getBoundingClientRect()
      const scrollable = height - window.innerHeight
      if (scrollable <= 0) {
        setProgress(0)
        return
      }
      setProgress(Math.min(1, Math.max(0, -top / scrollable)))
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return { ref, progress }
}
