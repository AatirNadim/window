import { Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useKeybindingStore } from "@/store/keybindingStore"
import { Kbd } from "./Kbd"

interface KeyboardShortcutsButtonProps {
  className?: string
}

export function KeyboardShortcutsButton({ className }: KeyboardShortcutsButtonProps) {
  const { toggleCheatSheet } = useKeybindingStore()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="default"
          onClick={toggleCheatSheet}
          aria-label="Keyboard shortcuts cheat sheet"
          className={`h-11 gap-2 rounded-lg bg-card px-3 text-foreground transition-colors ${className ?? ""}`}
        >
          <Keyboard className="size-[1.2rem]" />
          <Kbd size="sm" aria-hidden="true">?</Kbd>
          <span className="sr-only">Keyboard shortcuts</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-1.5">
        <span>Keyboard shortcuts</span>
        <Kbd variant="tooltip" size="sm">?</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
