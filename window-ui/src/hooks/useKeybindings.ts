import { useEffect, useCallback, useRef } from "react"
import { isBrowserReservedShortcut, isEditableElement } from "@/lib/keybindings"

export interface ShortcutDefinition {
  keys: string[] // e.g. ["Alt+C", "c", "?"]
  handler: (e: KeyboardEvent) => void
  allowInInput?: boolean
  preventDefault?: boolean
  enabled?: boolean
}

/**
 * Normalizes and checks if a KeyboardEvent matches a given shortcut string.
 * Examples: "Alt+C", "c", "?", "Escape", "Enter", "Alt+Enter", "Alt+/"
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split("+").map((p) => p.trim())
  const key = parts[parts.length - 1]
  const modifiers = parts.slice(0, parts.length - 1).map((m) => m.toLowerCase())

  const hasAlt = modifiers.includes("alt")
  const hasCtrl = modifiers.includes("ctrl")
  const hasShift = modifiers.includes("shift")
  const hasMeta = modifiers.includes("meta") || modifiers.includes("cmd")

  // Check modifier matches
  if (hasAlt !== event.altKey) return false
  if (hasCtrl !== event.ctrlKey) return false
  if (hasMeta !== event.metaKey) return false

  // For Shift: if modifier explicitly specifies Shift, check event.shiftKey
  // For special characters like '?' which intrinsically require Shift, event.key is already '?'
  if (hasShift && !event.shiftKey) return false

  // Compare main key
  const eventKey = event.key
  if (key === "?" || key === "/") {
    return eventKey === key
  }

  if (key.toLowerCase() === "enter" || key.toLowerCase() === "escape" || key.toLowerCase() === "tab") {
    return eventKey.toLowerCase() === key.toLowerCase()
  }

  return eventKey.toLowerCase() === key.toLowerCase()
}

/**
 * Custom React hook for registering screen keybindings with guaranteed
 * browser collision prevention and input isolation.
 */
export function useKeybindings(shortcuts: ShortcutDefinition[]) {
  const shortcutsRef = useRef(shortcuts)

  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 1. Never intercept browser or OS reserved shortcuts (tabs, refresh, find, devtools, etc.)
    if (isBrowserReservedShortcut(event)) {
      return
    }

    const inInput = isEditableElement(document.activeElement)

    for (const def of shortcutsRef.current) {
      if (def.enabled === false) continue

      const matches = def.keys.some((shortcut) => matchesShortcut(event, shortcut))
      if (!matches) continue

      // If user is actively typing in an input/textarea and the shortcut is not allowed in input, skip
      if (inInput && !def.allowInInput) {
        continue
      }

      if (def.preventDefault !== false) {
        event.preventDefault()
      }

      def.handler(event)
      break
    }
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])
}
