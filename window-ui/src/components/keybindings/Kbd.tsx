import * as React from "react"
import { cn } from "@/lib/utils"

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

export function Kbd({ children, className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md border border-border/80 bg-muted/90 font-mono text-[11px] font-semibold text-foreground shadow-xs select-none tracking-wide",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
