import { Outlet, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { KeybindingCheatSheet } from "@/components/keybindings/KeybindingCheatSheet"
import { useKeybindings } from "@/hooks/useKeybindings"
import { useKeybindingStore } from "@/store/keybindingStore"
import { useTheme } from "@/components/theme-provider"

function RootComponent() {
  const { toggleCheatSheet, closeCheatSheet, isCheatSheetOpen } =
    useKeybindingStore()
  const { theme, setTheme } = useTheme()

  useKeybindings([
    {
      keys: ["?", "Alt+/"],
      handler: () => toggleCheatSheet(),
      allowInInput: false,
    },
    {
      keys: ["Escape"],
      handler: () => {
        if (isCheatSheetOpen) {
          closeCheatSheet()
        } else if (
          document.activeElement instanceof HTMLElement &&
          document.activeElement !== document.body
        ) {
          document.activeElement.blur()
        }
      },
      allowInInput: true,
    },
    {
      keys: ["Alt+T"],
      handler: () => setTheme(theme === "light" ? "dark" : "light"),
      allowInInput: false,
    },
  ])

  return (
    <>
      <Outlet />
      <KeybindingCheatSheet />
      <TanStackRouterDevtools />
    </>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
