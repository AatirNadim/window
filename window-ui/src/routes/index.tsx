import { v4 as uuidv4 } from "uuid"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Share2, Plus, ArrowRight, Sparkles, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { useUserStore } from "@/store"
import { isValidUUID } from "@/lib/utils"

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

    toast.success("Joining room...", {
      description: `Connecting to room: ${roomId}`,
    })
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="relative z-5 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-7xl mx-auto">
          {/* Mobile/Tablet Layout (Vertical) */}
          <div className="flex flex-col items-center justify-center space-y-16 md:hidden">
            {/* Header section */}
            <motion.div
              className="text-center space-y-8"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="flex items-center justify-center flex-row"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-30" />
                  <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
                    <Share2 className="w-8 h-8 text-white" />
                  </div>
                </div>
              </motion.div>

              <div className="space-y-4">
                <motion.h1
                  className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent tracking-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  Window
                </motion.h1>
                <motion.p
                  className="text-lg text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  Share files instantly with peer-to-peer connections. No
                  uploads, no limits, just direct transfers.
                </motion.p>
              </div>

              {/* Features */}
              <motion.div
                className="grid grid-cols-1 gap-4 max-w-sm mx-auto"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                  <div className="w-8 h-8 rounded-lg border-2 border-blue-500/60 flex items-center justify-center bg-blue-50/50 dark:bg-blue-900/20">
                    <Zap
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      Lightning Fast
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Direct P2P transfers
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                  <div className="w-8 h-8 rounded-lg border-2 border-purple-500/60 flex items-center justify-center bg-purple-50/50 dark:bg-purple-900/20">
                    <Shield
                      className="w-4 h-4 text-purple-600 dark:text-purple-400"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      Secure & Private
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      End-to-end encrypted
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                  <div className="w-8 h-8 rounded-lg border-2 border-pink-500/60 flex items-center justify-center bg-pink-50/50 dark:bg-pink-900/20">
                    <Sparkles
                      className="w-4 h-4 text-pink-600 dark:text-pink-400"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      No Limits
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Any file size
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Main card */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <Card className="w-[360px] backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-white/30 dark:border-gray-700/30 shadow-2xl shadow-black/5 dark:shadow-black/20">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                    Start Sharing
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    Create a room or join an existing one to begin file sharing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      onClick={handleCreateRoom}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create a New Room
                    </Button>
                  </motion.div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-gray-900 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Or join a room
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full items-center space-x-2">
                    <Input
                      type="text"
                      placeholder="Enter Room ID"
                      value={roomId || ""}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="flex-1 h-12 bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
                    />
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleJoinRoom}
                        className="h-12 px-5 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 hover:from-gray-900 hover:to-black dark:hover:from-gray-600 dark:hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Desktop Layout (Horizontal) */}
          <div className="hidden md:grid md:grid-cols-2 md:gap-16 lg:gap-24 items-center min-h-[80vh]">
            {/* Left side - Logo and metadata */}
            <motion.div
              className="space-y-10"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Logo and title */}
              <div className="space-y-8">
                <motion.div
                  className="flex items-center gap-2 md:gap-4 lg:gap-6"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-30" />
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
                      <Share2 className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h1 className="text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent leading-tight tracking-tight">
                    Window
                  </h1>
                </motion.div>

                <motion.p
                  className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  Share files instantly with peer-to-peer connections. No
                  uploads, no limits, just direct transfers.
                </motion.p>
              </div>

              {/* Features */}
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <div className="flex items-center space-x-5 p-5 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl border-2 border-blue-500/60 flex items-center justify-center bg-blue-50/50 dark:bg-blue-900/20">
                    <Zap
                      className="w-6 h-6 text-blue-600 dark:text-blue-400"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      Lightning Fast
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      Direct peer-to-peer transfers with no server bottlenecks
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-5 p-5 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl border-2 border-purple-500/60 flex items-center justify-center bg-purple-50/50 dark:bg-purple-900/20">
                    <Shield
                      className="w-6 h-6 text-purple-600 dark:text-purple-400"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      Secure & Private
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      End-to-end encrypted transfers, no data stored on servers
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-5 p-5 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl border-2 border-pink-500/60 flex items-center justify-center bg-pink-50/50 dark:bg-pink-900/20">
                    <Sparkles
                      className="w-6 h-6 text-pink-600 dark:text-pink-400"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      No Limits
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      Share files of any size without restrictions
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Footer text */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Built with modern web technologies for seamless file sharing
                </p>
              </motion.div>
            </motion.div>

            {/* Right side - Input card */}
            <motion.div
              className="flex justify-center lg:justify-end"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="w-[440px] backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-white/30 dark:border-gray-700/30 shadow-2xl shadow-black/5 dark:shadow-black/20">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                    Start Sharing
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Create a room or join an existing one to begin file sharing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-lg focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      onClick={handleCreateRoom}
                    >
                      <Plus className="w-5 h-5 mr-3" />
                      Create a New Room
                    </Button>
                  </motion.div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-gray-900 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Or join a room
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full items-center space-x-3">
                    <Input
                      type="text"
                      placeholder="Enter Room ID"
                      value={roomId || ""}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="flex-1 h-14 bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-base"
                      onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
                    />
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleJoinRoom}
                        className="h-14 px-6 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 hover:from-gray-900 hover:to-black dark:hover:from-gray-600 dark:hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
