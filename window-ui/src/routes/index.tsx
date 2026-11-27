import { useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useUserStore } from "@/store"
import { useKeybindings } from "@/hooks/useKeybindings"
import { isValidUUID } from "@/lib/utils"
import HeroSection from "@/components/home/heroSection"
import InfiniteWindowBackground from "@/components/home/infiniteWindowBackground"
import LandingNavbar from "@/components/landing/landingNavbar"
import InteractiveDemo from "@/components/landing/interactiveDemo"
import ModesComparison from "@/components/landing/modesComparison"
import SecurityArchitecture from "@/components/landing/securityArchitecture"
import LimitsMatrix from "@/components/landing/limitsMatrix"
import FAQSection from "@/components/landing/faqSection"
import LandingFooter from "@/components/landing/landingFooter"

export const Route = createFileRoute("/")({
  component: Home,
})

export default function Home() {
  const navigate = useNavigate()
  const { initializeUser, roomId, setRoomId } = useUserStore()
  const [name, setName] = useState(useUserStore.getState().userName ?? "")
  const [nameError, setNameError] = useState("")
  const roomInputRef = useRef<HTMLInputElement>(null)
  const [roomIdError, setRoomIdError] = useState("")

  const handleCreateRoom = () => {
    if (!name.trim()) { setNameError("Enter your name or generate one."); document.getElementById("user-name")?.focus(); return }
    const newRoomId = uuidv4()
    initializeUser(name, newRoomId)

    // navigate to the new room
    navigate({ to: `/room/${newRoomId}` })

  }

  const handleJoinRoom = () => {
    if (!roomId?.trim()) {
      setRoomIdError("Enter a room ID to join.")
      roomInputRef.current?.focus()
      return
    }

    if (!isValidUUID(roomId.trim())) {
      setRoomIdError("Enter a valid room ID, or ask the sender to share it again.")
      roomInputRef.current?.focus()
      return
    }

    setRoomIdError("")
    if (!name.trim()) { setNameError("Enter your name or generate one."); document.getElementById("user-name")?.focus(); return }
    initializeUser(name, roomId.trim())

    navigate({ to: `/room/${roomId.trim()}` })
  }

  const handlePasteRoomId = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const clean = text.trim()
      if (clean) {
        setRoomId(clean)
        setRoomIdError("")
        roomInputRef.current?.focus()
      } else {
        toast.warning("Clipboard is empty", { description: "Copy a room ID, then try again." })
      }
    } catch {
      roomInputRef.current?.focus()
      toast.error("Could not read the clipboard", { description: "Paste the room ID into the field manually." })
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
  ])

  return (
    <div className="relative isolate min-h-svh overflow-x-clip bg-background text-foreground">
      <InfiniteWindowBackground />
      <LandingNavbar />
      <main className="relative z-10 flex flex-col">
        <div className="px-4 sm:px-6 lg:px-8">
          <HeroSection
            name={name}
            nameError={nameError}
            setName={(value) => { setName(value); setNameError("") }}
            roomId={roomId}
            setRoomId={(id) => {
              setRoomId(id)
              setRoomIdError("")
            }}
            roomIdError={roomIdError}
            handleCreateRoom={handleCreateRoom}
            handleJoinRoom={handleJoinRoom}
            inputRef={roomInputRef}
            onPasteRoomId={handlePasteRoomId}
          />
        </div>
        <InteractiveDemo />
        <ModesComparison />
        <SecurityArchitecture />
        <LimitsMatrix />
        <FAQSection />
      </main>
      <LandingFooter handleCreateRoom={handleCreateRoom} />
    </div>
  )
}
