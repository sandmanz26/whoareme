import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  /**
   * Optional, and rationed. Four sections each carrying a small uppercase
   * label above the headline is what makes a page read as templated: the
   * rhythm repeats before the content does. Use it only where the headline
   * genuinely cannot say what the section is.
   */
  eyebrow?: string
  title: ReactNode
  description?: string
  action?: ReactNode
}

export function SectionHeading({ eyebrow, title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className={cn("display text-[clamp(2rem,5vw,3.25rem)]", eyebrow && "mt-3")}>{title}</h2>
        {description && <p className="mt-4 text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
