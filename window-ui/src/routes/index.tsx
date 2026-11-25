import { useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyboardShortcutsButton } from "@/components/keybindings/KeyboardShortcutsButton"
import { useUserStore } from "@/store"
import { useTheme } from "@/components/theme-provider"
import { useKeybindings } from "@/hooks/useKeybindings"
import { isValidUUID } from "@/lib/utils"
import HeroSection from "@/components/home/heroSection"
import InfiniteWindowBackground from "@/components/home/infiniteWindowBackground"

export const Route = createFileRoute("/")({
  component: Home,
})

export default function Home() {
  const navigate = useNavigate()
  const { initializeUser, roomId, setRoomId } = useUserStore()
  const { theme, setTheme } = useTheme()
  const roomInputRef = useRef<HTMLInputElement>(null)

  const handleCreateRoom = () => {
    // Initialize user before creating room
    initializeUser()

    const newRoomId = uuidv4()
    setRoomId(newRoomId)

    // navigate to the new room
    navigate({ to: `/room/${newRoomId}` })

    toast.success("Room Created!", {
      description: `Your room ID is: ${newRoomId}`,
    })
  }

  const handleJoinRoom = () => {
    if (!roomId?.trim()) {
      toast.error("Invalid Room ID", {
        description: "Please enter a room ID to join.",
      })
      return
    }

    if (!isValidUUID(roomId.trim())) {
      setRoomId("") // Clear the input field
      toast.error("Invalid Room ID Format", {
        description: "Please enter a valid UUID format room ID.",
      })
      return
    }

    initializeUser()

    navigate({ to: `/room/${roomId}` })
  }

  const handlePasteRoomId = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const clean = text.trim()
      if (clean) {
        setRoomId(clean)
        roomInputRef.current?.focus()
        toast.info("Pasted from clipboard", { description: clean })
      }
    } catch {
      roomInputRef.current?.focus()
    }
  }

  // Register Home screen keybindings
  useKeybindings([
    {
      keys: ["c", "Alt+C"],
      handler: handleCreateRoom,
      allowInInput: false,
    },
    {
      keys: ["/", "j", "Alt+J"],
      handler: () => {
        roomInputRef.current?.focus()
        roomInputRef.current?.select()
      },
      allowInInput: false,
    },
    {
      keys: ["v", "Alt+V"],
      handler: handlePasteRoomId,
      allowInInput: false,
    },
    {
      keys: ["t", "Alt+T"],
      handler: () => setTheme(theme === "light" ? "dark" : "light"),
      allowInInput: false,
    },
  ])

  return (
    <div className="relative isolate min-h-svh bg-background">
      <InfiniteWindowBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-end gap-2 px-4 pt-4 sm:px-6 lg:px-8">
        <KeyboardShortcutsButton />
        <ThemeToggle />
      </header>
      <div className="relative z-10 px-4 sm:px-6 lg:px-8">
        <HeroSection
          roomId={roomId}
          setRoomId={setRoomId}
          handleCreateRoom={handleCreateRoom}
          handleJoinRoom={handleJoinRoom}
          inputRef={roomInputRef}
        />
      </div>
    </div>
  )
}
