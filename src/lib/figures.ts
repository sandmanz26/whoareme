import type { Work, WorkFigure } from "@/data/work"

export type FigureShape = "wide" | "tall" | "square"

/**
 * A dashboard screenshot and a phone screen are not the same object, and
 * showing them at the same width makes one unreadable and the other absurd.
 * The shape is read from the intrinsic dimensions, so the layout is decided
 * before a single byte of image has loaded.
 */
export function shapeOf(figure: WorkFigure): FigureShape {
  const ratio = figure.width / Math.max(1, figure.height)
  if (ratio >= 1.6) return "wide"
  if (ratio <= 0.8) return "tall"
  return "square"
}

export type FigureLayout = "wide" | "tall" | "square" | "pair" | "grid" | "slider"

/**
 * Count matters as much as shape. Two figures under one heading is almost
 * always a before/after, and putting them side by side is the whole argument;
 * stacking them makes the reader hold the first one in memory. Three or more
 * is a set, and a set wants a grid.
 */
export function layoutFor(figures: readonly WorkFigure[]): FigureLayout {
  // An author opt-in, never a default. A slider hides everything past the
  // first slide, which is the right trade only for a sequence the reader is
  // meant to step through - not for evidence they are meant to compare.
  if (figures.length > 1 && figures.some((figure) => figure.display === "slider")) return "slider"
  if (figures.length >= 3) return "grid"
  if (figures.length === 2) return "pair"
  return shapeOf(figures[0]!)
}

/** Figures belonging to one chapter, in author order. */
export function figuresFor(work: Work, section: string): WorkFigure[] {
  return (work.figures ?? []).filter((figure) => figure.section === section)
}

/** Anything whose section no longer matches a chapter, so nothing is lost silently. */
export function orphanFigures(work: Work, sections: readonly string[]): WorkFigure[] {
  const known = new Set(sections)
  return (work.figures ?? []).filter((figure) => !known.has(figure.section))
}

export const SHAPE_LABEL: Record<FigureShape, string> = {
  wide: "Wide",
  tall: "Tall",
  square: "Square",
}

/** Human-readable ratio for the editor, e.g. "16:9". */
export function ratioLabel(figure: WorkFigure): string {
  const divisor = gcd(figure.width, figure.height)
  const w = Math.round(figure.width / divisor)
  const h = Math.round(figure.height / divisor)
  // Reduce awkward ratios like 1921:1080 to something a person recognises, and
  // keep the larger side first - "1:2.04" reads as tall, "0.49:1" reads as
  // nothing at all.
  if (w > 32 || h > 32) {
    const ratio = figure.width / figure.height
    return ratio >= 1
      ? `${trim(ratio)}:1`
      : `1:${trim(1 / ratio)}`
  }
  return `${w}:${h}`
}

function trim(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "")
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}
