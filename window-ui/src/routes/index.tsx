import { v4 as uuidv4 } from "uuid"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"
import { useUserStore } from "@/store"
import { isValidUUID } from "@/lib/utils"
import GradientBackground from "@/components/home/gradientBackground"
import AnimatedDotsBackground from "@/components/home/animatedDotsBackground"
import HeroSection from "@/components/home/heroSection"

export const Route = createFileRoute("/")({
  component: Home,
})

export default function Home() {
  const navigate = useNavigate()
  const { initializeUser, roomId, setRoomId } = useUserStore()

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

  return (
    <div className="min-h-screen relative overflow-hidden">
      
        {/* Background with solid color */}
        <GradientBackground />

        {/* Animated dots background */}
        <AnimatedDotsBackground />

        {/* Theme toggle */}
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>

        {/* Main content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-7xl mx-auto">
            <HeroSection
              roomId={roomId}
              setRoomId={setRoomId}
              handleCreateRoom={handleCreateRoom}
              handleJoinRoom={handleJoinRoom}
            />
          </div>
        </div>
    </div>
  )
}
