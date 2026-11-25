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
          size="icon"
          onClick={toggleCheatSheet}
          aria-label="Keyboard shortcuts cheat sheet"
          className={`relative size-11 rounded-lg bg-card text-foreground transition-colors ${className ?? ""}`}
        >
          <Keyboard className="size-[1.2rem]" />
          <span className="sr-only">Keyboard shortcuts</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-1.5">
        <span>Keyboard shortcuts</span>
        <Kbd className="bg-background text-foreground border-border/50 text-[10px] h-5 min-w-5">?</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
