import { useMemo, useRef } from "react"
import {
  CheckCircle2,
  Command,
  Keyboard,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { KEYBINDING_RECORDS } from "@/lib/keybindings"
import { useKeybindingStore } from "@/store/keybindingStore"
import { Kbd } from "./Kbd"
import { cn } from "@/lib/utils"

const CATEGORIES = ["All", "Global", "Home Screen", "Room Screen", "Pull Sharing"] as const

export function KeybindingCheatSheet() {
  const {
    isCheatSheetOpen,
    closeCheatSheet,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useKeybindingStore()

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter records based on active category and search text
  const filteredRecords = useMemo(() => {
    return KEYBINDING_RECORDS.filter((record) => {
      const matchesCategory =
        selectedCategory === "All" || record.category === selectedCategory

      if (!matchesCategory) return false

      if (!searchQuery.trim()) return true

      const query = searchQuery.toLowerCase().trim()
      const inTitle = record.title.toLowerCase().includes(query)
      const inDesc = record.description.toLowerCase().includes(query)
      const inCategory = record.category.toLowerCase().includes(query)
      const inCombos = record.combos.some((c) =>
        c.display.toLowerCase().includes(query) ||
        c.keys.some((k) => k.toLowerCase().includes(query))
      )

      return inTitle || inDesc || inCategory || inCombos
    })
  }, [selectedCategory, searchQuery])

  // Group records by category for structured display
  const groupedRecords = useMemo(() => {
    const groups: Record<string, typeof filteredRecords> = {}
    for (const record of filteredRecords) {
      if (!groups[record.category]) {
        groups[record.category] = []
      }
      groups[record.category].push(record)
    }
    return groups
  }, [filteredRecords])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: KEYBINDING_RECORDS.length }
    for (const rec of KEYBINDING_RECORDS) {
      counts[rec.category] = (counts[rec.category] || 0) + 1
    }
    return counts
  }, [])

  return (
    <Dialog open={isCheatSheetOpen} onOpenChange={(open) => !open && closeCheatSheet()}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Keyboard size={18} />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Keyboard Shortcuts Cheat Sheet
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={12} /> Browser Safe
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Full reference of keybindings for every screen in Window. No conflicts with browser shortcuts.
              </DialogDescription>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder="Search shortcuts (e.g., create, send, copy, files, Esc)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 text-sm bg-background/80"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar text-xs">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0
              const isSelected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {cat}
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px]",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background/60 text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </DialogHeader>

        {/* Shortcuts list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 max-h-[50vh]">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Command size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No shortcuts match &quot;{searchQuery}&quot;</p>
              <p className="text-xs mt-1">Try searching for &quot;send&quot;, &quot;room&quot;, or &quot;theme&quot;</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("All")
                }}
                className="mt-3 text-xs"
              >
                Reset filters
              </Button>
            </div>
          ) : (
            Object.entries(groupedRecords).map(([category, records]) => (
              <section key={category} className="space-y-2.5" aria-labelledby={`cat-${category}`}>
                <h3
                  id={`cat-${category}`}
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
                >
                  <span>{category}</span>
                  <span className="text-[11px] font-normal lowercase">
                    {records.length} {records.length === 1 ? "shortcut" : "shortcuts"}
                  </span>
                </h3>

                <div className="divide-y divide-border/60 rounded-xl border border-border bg-card/60 overflow-hidden shadow-2xs">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 sm:gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {record.title}
                          </span>
                          {record.pauseInInput && (
                            <span
                              className="text-[10px] text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded"
                              title="Shortcut pauses while typing in an input field to avoid text interference"
                            >
                              Pauses in typing
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {record.description}
                        </p>
                      </div>

                      {/* Key combinations representation */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {record.combos.map((combo, idx) => (
                          <span key={combo.display} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-xs text-muted-foreground/60 mr-1">or</span>}
                            <span className="inline-flex items-center gap-1 bg-muted/40 p-0.5 rounded-md">
                              {combo.keys.map((k, kIdx) => (
                                <span key={k} className="inline-flex items-center">
                                  {kIdx > 0 && (
                                    <span className="text-[10px] text-muted-foreground mx-0.5">+</span>
                                  )}
                                  <Kbd>{k}</Kbd>
                                </span>
                              ))}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer with safety guarantee */}
        <div className="border-t border-border bg-muted/30 p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-start sm:items-center gap-2">
            <CheckCircle2 size={15} className="text-success shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Zero Browser Conflicts:</strong> Standard browser shortcuts (tabs, refresh, find, devtools) are never blocked.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span>Press</span>
            <Kbd>Esc</Kbd>
            <span>or</span>
            <Kbd>?</Kbd>
            <span>to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
