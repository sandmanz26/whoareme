import type { ReactNode } from "react"
import { useReveal } from "@/hooks/useReveal"
import type { CSSVars } from "@/lib/css"
import { cn } from "@/lib/utils"

/**
 * Entrance motion for a section of a case study.
 *
 * Transform and opacity only, so it stays on the compositor thread; 320ms,
 * within the range where motion reads as responsive rather than decorative;
 * and a small stagger, because chapters arriving in order reads as the page
 * settling rather than as an effect. The whole thing is neutralised by the
 * global `prefers-reduced-motion` block in index.css.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  /** Milliseconds. Keep the total under ~200 or the last item feels late. */
  delay?: number
  className?: string
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      style={{ "--reveal-delay": `${delay}ms` } as CSSVars}
      className={cn(
        "transition-[opacity,transform] duration-[320ms] ease-pop [transition-delay:var(--reveal-delay)]",
        revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  )
}
