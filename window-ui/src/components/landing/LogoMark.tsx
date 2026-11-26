import { Radio } from "lucide-react"
import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground", className)}>
      <Radio className="size-1/2" strokeWidth={2} aria-hidden="true" />
    </span>
  )
}
