import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { toast, Toaster } from "sonner"
import { ThemeProvider } from "./components/theme-provider"
import { isValidUUID } from "./lib/utils"
import LandingNavbar from "./components/landingNavbar"
import HeroSection from "./components/heroSection"
import InfiniteWindowBackground from "./components/infiniteWindowBackground"
import InteractiveDemo from "./components/interactiveDemo"
import ModesComparison from "./components/modesComparison"
import SecurityArchitecture from "./components/securityArchitecture"
import LimitsMatrix from "./components/limitsMatrix"
import FAQSection from "./components/faqSection"
import LandingFooter from "./components/landingFooter"

const APP_URL = (import.meta.env.VITE_APP_URL || "http://localhost:3000").replace(/\/$/, "")

export default function App() {
  const [roomId, setRoomId] = useState<string | null>("")

  const handleCreateRoom = () => {
    const newRoomId = uuidv4()
    toast.success("Launching room...", {
      description: `Room ID: ${newRoomId}`,
    })
    window.location.href = `${APP_URL}/room/${newRoomId}`
  }

  const handleJoinRoom = () => {
    if (!roomId?.trim()) {
      toast.error("Invalid Room ID", {
        description: "Please enter a room ID to join.",
      })
      return
    }

    if (!isValidUUID(roomId.trim())) {
      setRoomId("")
      toast.error("Invalid Room ID Format", {
        description: "Please enter a valid UUID format room ID.",
      })
      return
    }

    toast.info("Connecting to room...", {
      description: `Room ID: ${roomId.trim()}`,
    })
    window.location.href = `${APP_URL}/room/${roomId.trim()}`
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="window-theme">
      <div className="relative isolate min-h-svh bg-background text-foreground">
        <Toaster position="top-right" richColors />
        <InfiniteWindowBackground />
        <LandingNavbar />
        <main className="relative z-10 flex flex-col">
          <div className="px-4 sm:px-6 lg:px-8">
            <HeroSection
              roomId={roomId}
              setRoomId={setRoomId}
              handleCreateRoom={handleCreateRoom}
              handleJoinRoom={handleJoinRoom}
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
    </ThemeProvider>
  )
}
