import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const kbdVariants = cva(
  "inline-flex items-center justify-center rounded-md border font-mono font-semibold shadow-xs select-none tracking-wide",
  {
    variants: {
      variant: {
        default: "border-border/80 bg-muted/90 text-foreground",
        primary: "border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground",
        tooltip: "border-border/50 bg-background text-foreground",
      },
      size: {
        default: "min-w-6 h-6 px-1.5 text-[11px]",
        sm: "min-w-5 h-5 px-1 text-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface KbdProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof kbdVariants> {
  children: React.ReactNode
}

export function Kbd({ children, className, variant, size, ...props }: KbdProps) {
  return (
    <kbd className={cn(kbdVariants({ variant, size, className }))} {...props}>
      {children}
    </kbd>
  )
}
