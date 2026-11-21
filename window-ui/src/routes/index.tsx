import { v4 as uuidv4 } from "uuid"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"
import { useUserStore } from "@/store"
import { isValidUUID } from "@/lib/utils"
import HeroSection from "@/components/home/heroSection"
import AnimatedDotsBackground from "@/components/home/animatedDotsBackground"

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
    <div className="relative isolate min-h-svh bg-background">
      <AnimatedDotsBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl justify-end px-4 pt-4 sm:px-6 lg:px-8">
        <ThemeToggle />
      </header>
      <div className="relative z-10 px-4 sm:px-6 lg:px-8">
        <HeroSection
          roomId={roomId}
          setRoomId={setRoomId}
          handleCreateRoom={handleCreateRoom}
          handleJoinRoom={handleJoinRoom}
        />
      </div>
    </div>
  )
}
