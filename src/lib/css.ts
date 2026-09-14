import type { CSSProperties } from "react"

/** Lets us pass CSS custom properties through the `style` prop type-safely. */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>
