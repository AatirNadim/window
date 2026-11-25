export type KeybindingScope = "global" | "home" | "room"

export interface KeyCombination {
  keys: string[]
  display: string
}

export interface KeybindingRecord {
  id: string
  title: string
  description: string
  scope: KeybindingScope
  category: "Global" | "Home Screen" | "Room Screen" | "Pull Sharing"
  combos: KeyCombination[]
  actionHint?: string
  browserConflictSafe: boolean
  safetyRationale: string
  pauseInInput: boolean
}

/**
 * Check whether an active HTML element is an editable text field.
 * Single-key shortcuts must be inhibited when this returns true to prevent interference with typing.
 */
export function isEditableElement(element: Element | null): boolean {
  if (!element) return false

  const tagName = element.tagName.toLowerCase()
  if (tagName === "textarea" || tagName === "select") return true
  if (tagName === "input") {
    const inputType = (element as HTMLInputElement).type?.toLowerCase() || "text"
    const nonTextInputs = ["button", "checkbox", "radio", "submit", "reset", "file", "image"]
    return !nonTextInputs.includes(inputType)
  }

  const htmlEl = element as HTMLElement
  if (htmlEl.isContentEditable) return true
  if (htmlEl.contentEditable === "true" || htmlEl.contentEditable === "") return true
  const ce = element.getAttribute?.("contenteditable")
  if (ce !== null && ce !== undefined && ce !== "false") return true

  return false
}

/**
 * Determines whether a keyboard event is a protected browser or OS key combination
 * that should never be intercepted or overridden.
 */
export function isBrowserReservedShortcut(event: KeyboardEvent): boolean {
  const isCtrlOrMeta = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()

  // Standard browser navigation and window control shortcuts
  if (isCtrlOrMeta) {
    const reservedCtrlKeys = new Set([
      "t", // New tab
      "w", // Close tab
      "n", // New window
      "r", // Reload page
      "f", // Find on page
      "g", // Find next
      "p", // Print
      "s", // Save page
      "o", // Open file
      "u", // View source
      "h", // Browser history
      "j", // Browser downloads
      "d", // Bookmark
      "l", // Address bar focus
      "a", // Select all
      "c", // Copy
      "v", // Paste
      "x", // Cut
      "z", // Undo
      "y", // Redo
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", // Jump to tab
      "+", "=", "-", "_", // Zoom controls
      "tab", // Switch tab
    ])

    if (reservedCtrlKeys.has(key)) return true
    if (event.shiftKey && (key === "r" || key === "n" || key === "i" || key === "j" || key === "c" || key === "delete")) {
      return true // Hard reload, incognito, devtools, inspect, clear history
    }
  }

  // Developer tools and browser function keys
  if (event.key === "F5" || event.key === "F12" || event.key === "F11" || event.key === "F3" || event.key === "F1") {
    return true
  }

  // Back/forward navigation via Alt + Arrow keys
  if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    return true
  }

  return false
}

/**
 * Master catalog of all keybinding records in Window UI.
 * Every record is documented with its screen scope, key combinations,
 * and safety rationale to guarantee zero conflicts with browser functionality.
 */
export const KEYBINDING_RECORDS: KeybindingRecord[] = [
  // GLOBAL
  {
    id: "global-cheat-sheet",
    title: "Keyboard shortcuts cheat sheet",
    description: "Open or close this cheat sheet dialog from any screen in the application.",
    scope: "global",
    category: "Global",
    combos: [
      { keys: ["?"], display: "?" },
      { keys: ["Alt", "/"], display: "Alt + /" },
    ],
    actionHint: "Toggle shortcuts modal",
    browserConflictSafe: true,
    safetyRationale: "Single key '?' is suppressed while typing in input fields. Alt + / is browser-safe across all major operating systems.",
    pauseInInput: true,
  },
  {
    id: "global-close-dialog",
    title: "Close modal / Blur input",
    description: "Dismiss any open modal or cheat sheet, or unfocus the current text input field.",
    scope: "global",
    category: "Global",
    combos: [
      { keys: ["Escape"], display: "Esc" },
    ],
    actionHint: "Dismiss modal or unfocus",
    browserConflictSafe: true,
    safetyRationale: "Standard accessible web behavior for escaping focus or closing overlay sheets.",
    pauseInInput: false,
  },
  {
    id: "global-toggle-theme",
    title: "Toggle light / dark theme",
    description: "Switch application appearance between Light and Dark visual themes.",
    scope: "global",
    category: "Global",
    combos: [
      { keys: ["Alt", "T"], display: "Alt + T" },
      { keys: ["T"], display: "T" },
    ],
    actionHint: "Toggle color theme",
    browserConflictSafe: true,
    safetyRationale: "Browser tab opening uses Ctrl/Cmd+T, not Alt+T. Single key 'T' is paused inside inputs.",
    pauseInInput: true,
  },
  {
    id: "global-go-home",
    title: "Navigate to Home",
    description: "Return to the home screen from any active room or view.",
    scope: "global",
    category: "Global",
    combos: [
      { keys: ["Alt", "H"], display: "Alt + H" },
    ],
    actionHint: "Return to Home",
    browserConflictSafe: true,
    safetyRationale: "Alt + H does not conflict with browser history (which is Ctrl/Cmd+H).",
    pauseInInput: true,
  },

  // HOME SCREEN
  {
    id: "home-create-room",
    title: "Create new room",
    description: "Generate a new room with a unique UUID and navigate directly to it.",
    scope: "home",
    category: "Home Screen",
    combos: [
      { keys: ["Alt", "C"], display: "Alt + C" },
      { keys: ["C"], display: "C" },
    ],
    actionHint: "Initialize & navigate to new room",
    browserConflictSafe: true,
    safetyRationale: "Ctrl/Cmd+C is reserved for copy; Alt+C is non-conflicting. 'C' alone pauses when typing in the Room ID input.",
    pauseInInput: true,
  },
  {
    id: "home-focus-room-input",
    title: "Focus Room ID input",
    description: "Instantly focus the Room ID input field to paste or type a room code.",
    scope: "home",
    category: "Home Screen",
    combos: [
      { keys: ["/"], display: "/" },
      { keys: ["Alt", "J"], display: "Alt + J" },
      { keys: ["J"], display: "J" },
    ],
    actionHint: "Focus join input field",
    browserConflictSafe: true,
    safetyRationale: "'/' is the standard search/input focus convention (GitHub, Linear). Alt+J avoids browser download history (Ctrl+J).",
    pauseInInput: true,
  },
  {
    id: "home-join-room",
    title: "Join room",
    description: "Validate the room ID format and enter the room if valid.",
    scope: "home",
    category: "Home Screen",
    combos: [
      { keys: ["Enter"], display: "Enter (in input)" },
      { keys: ["Alt", "Enter"], display: "Alt + Enter" },
    ],
    actionHint: "Submit Room ID",
    browserConflictSafe: true,
    safetyRationale: "Standard form submit interaction inside inputs; does not conflict with browser navigation.",
    pauseInInput: false,
  },
  {
    id: "home-paste-room-id",
    title: "Paste Room ID from clipboard",
    description: "Read clipboard text, validate UUID format, and populate the Room ID input.",
    scope: "home",
    category: "Home Screen",
    combos: [
      { keys: ["Alt", "V"], display: "Alt + V" },
      { keys: ["V"], display: "V" },
    ],
    actionHint: "Paste and populate room ID",
    browserConflictSafe: true,
    safetyRationale: "Standard paste is Ctrl/Cmd+V. Alt+V and un-focused 'V' allow quick 1-touch room pasting without conflict.",
    pauseInInput: true,
  },

  // ROOM SCREEN
  {
    id: "room-select-files",
    title: "Choose files to send",
    description: "Open system file dialog to stage files for peer-to-peer transfer.",
    scope: "room",
    category: "Room Screen",
    combos: [
      { keys: ["Alt", "U"], display: "Alt + U" },
      { keys: ["U"], display: "U" },
      { keys: ["F"], display: "F" },
    ],
    actionHint: "Open file selector",
    browserConflictSafe: true,
    safetyRationale: "Ctrl+U is View Source in browsers; Alt+U is completely safe. Single keys 'U' and 'F' pause inside inputs.",
    pauseInInput: true,
  },
  {
    id: "room-send-files",
    title: "Send staged files",
    description: "Transmit all staged files to connected peers over the WebRTC data channel.",
    scope: "room",
    category: "Room Screen",
    combos: [
      { keys: ["Alt", "S"], display: "Alt + S" },
      { keys: ["S"], display: "S" },
    ],
    actionHint: "Send files to peer",
    browserConflictSafe: true,
    safetyRationale: "Ctrl/Cmd+S is Save Webpage; Alt+S does not trigger browser save. 'S' single key pauses when typing.",
    pauseInInput: true,
  },
  {
    id: "room-clear-files",
    title: "Clear selected files",
    description: "Remove all currently selected files from the staging queue.",
    scope: "room",
    category: "Room Screen",
    combos: [
      { keys: ["Alt", "X"], display: "Alt + X" },
      { keys: ["X"], display: "X" },
    ],
    actionHint: "Empty transfer queue",
    browserConflictSafe: true,
    safetyRationale: "Ctrl/Cmd+X is Cut; Alt+X and un-focused 'X' are safe from clipboard cut overrides.",
    pauseInInput: true,
  },
  {
    id: "room-copy-id",
    title: "Copy Room ID",
    description: "Copy the unique room UUID to the system clipboard.",
    scope: "room",
    category: "Room Screen",
    combos: [
      { keys: ["Alt", "R"], display: "Alt + R" },
      { keys: ["R"], display: "R" },
    ],
    actionHint: "Copy room ID to clipboard",
    browserConflictSafe: true,
    safetyRationale: "Ctrl/Cmd+R reloads the page; Alt+R avoids reload. 'R' pauses when typing.",
    pauseInInput: true,
  },
  {
    id: "room-copy-invite",
    title: "Copy invite link",
    description: "Copy full URL link to clipboard so a peer can join with one click.",
    scope: "room",
    category: "Room Screen",
    combos: [
      { keys: ["Alt", "I"], display: "Alt + I" },
      { keys: ["I"], display: "I" },
    ],
    actionHint: "Copy invite URL to clipboard",
    browserConflictSafe: true,
    safetyRationale: "Ctrl+Shift+I opens DevTools; Alt+I is completely safe from browser devtool shortcuts.",
    pauseInInput: true,
  },
  {
    id: "room-toggle-peers",
    title: "Toggle connected peers",
    description: "Show or hide the connected peers sheet / mobile drawer.",
    scope: "room",
    category: "Room Screen",
    combos: [
      { keys: ["Alt", "P"], display: "Alt + P" },
      { keys: ["P"], display: "P" },
    ],
    actionHint: "Toggle peers drawer",
    browserConflictSafe: true,
    safetyRationale: "Ctrl/Cmd+P opens Print dialog; Alt+P is safe from browser print dialogs.",
    pauseInInput: true,
  },
  {
    id: "room-leave",
    title: "Leave room",
    description: "Disconnect from peers, terminate WebRTC channel, and return to Home.",
    scope: "room",
    category: "Room Screen",
    combos: [
      { keys: ["Alt", "L"], display: "Alt + L" },
      { keys: ["L"], display: "L" },
    ],
    actionHint: "Disconnect & leave room",
    browserConflictSafe: true,
    safetyRationale: "Ctrl/Cmd+L focuses browser address bar; Alt+L is safe.",
    pauseInInput: true,
  },

  // PULL SHARING
  {
    id: "room-offer-files",
    title: "Offer files for pull sharing",
    description: "Select files to make available in the room for peer pull requests.",
    scope: "room",
    category: "Pull Sharing",
    combos: [
      { keys: ["Alt", "O"], display: "Alt + O" },
      { keys: ["O"], display: "O" },
    ],
    actionHint: "Choose files to offer to peers",
    browserConflictSafe: true,
    safetyRationale: "Ctrl/Cmd+O opens file in browser; Alt+O is safe and non-conflicting.",
    pauseInInput: true,
  },
]
