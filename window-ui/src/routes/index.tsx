import { useRef } from "react"
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
  ])

  return (
    <div className="relative isolate min-h-svh bg-background text-foreground">
      <InfiniteWindowBackground />
      <LandingNavbar />
      <main className="relative z-10 flex flex-col">
        <div className="px-4 sm:px-6 lg:px-8">
          <HeroSection
            roomId={roomId}
            setRoomId={setRoomId}
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
