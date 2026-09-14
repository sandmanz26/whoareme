import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "pop" | "outline" | "ghost"
type Size = "sm" | "md" | "lg"

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2",
  pop: "bg-pop-lime text-ink hover:brightness-95",
  outline: "border border-ink/15 bg-card text-ink hover:border-ink hover:bg-paper",
  ghost: "text-ink hover:bg-ink/5",
}

const SIZES: Record<Size, string> = {
  // Every size clears the 44px touch target once padding is included.
  sm: "h-10 gap-1.5 px-4 text-sm",
  md: "h-12 gap-2 px-5 text-sm",
  lg: "h-14 gap-2.5 px-7 text-base",
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-pill font-display font-medium",
        "transition-all duration-200 ease-pop active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
