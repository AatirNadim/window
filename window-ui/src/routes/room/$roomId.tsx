import { useEffect, useMemo } from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  Link,
  Send,
  Wifi,
  WifiOff,
  ArrowLeft,
  Clock,
  Users,
  User,
  Copy,
} from "lucide-react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useUserStore } from "@/store"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useFileStore } from "@/store/fileStore"
import { useFile } from "@/store/hooks/fileHook"
import { useSocket } from "@/store/hooks/socketHook"
import GradientBackground from "@/components/home/gradientBackground"
import BackgroundElementsAnimated from "@/components/home/backgroundElementsAnimated"
import FileUpload from "@/components/room/fileUpload"
import ProgressSection from "@/components/room/progress"

export const Route = createFileRoute("/room/$roomId")({
  component: Room,
})

export default function Room() {
  const navigate = useNavigate()

  // Zustand store
  const { userId, userName, roomId, remoteUsers } = useUserStore()

  const { file, receivedFileInfo, transferProgress, isSending } = useFileStore()

  const {
    dataChannelMap,
    isConnected,
    status,
    createWSConnection,
    peerConnections,
    cleanUp,
  } = useSocket()

  const { sendFile } = useFile({ peerConnections, dataChannelMap })

  // useEffect(() => {
  //   console.debug("Transfer progress updated:", transferProgress)
  // }, [transferProgress])

  useEffect(() => {
    console.debug("Remote users updated:", remoteUsers)
  }, [remoteUsers])

  useEffect(() => {
    if (!userId || !userName) {
      toast.error("User Initialization Failed", {
        description:
          "Failed to initialize user details. Please refresh the page.",
      })
      return
    }

    // Full page unload (refresh, close tab, navigate to another origin, etc.)
    window.addEventListener("beforeunload", cleanUp)

    console.debug("creating socket connection for room:", roomId)

    try {
      createWSConnection()
    } catch (error) {
      console.error(
        "In the room component, socket connection failed with error:",
        error,
      )
      navigate({ to: "/" })
    }

    return () => {
      // Leave room and clear userId when navigating away
      window.removeEventListener("beforeunload", cleanUp)
      cleanUp()
    }
  }, [roomId, userId])

  const getStatusIcon = useMemo(() => {
    if (isConnected) return <Wifi className="w-4 h-4 text-green-500" />
    if (status.includes("Connecting") || status.includes("Joining"))
      return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
    if (status.includes("failed") || status.includes("Disconnected"))
      return <WifiOff className="w-4 h-4 text-red-500" />
    return <Users className="w-4 h-4 text-blue-500" />
  }, [isConnected, status])

  const getStatusColor = useMemo(() => {
    if (isConnected) return "bg-green-500"
    if (status.includes("failed") || status.includes("Disconnected"))
      return "bg-red-500"
    return "bg-yellow-500"
  }, [isConnected, status])

  return (
    <div className="min-h-screen relative overflow-hidden min-w-lg">
      {/* Background with gradient */}
      <GradientBackground />

      {/* Animated background elements */}
      <BackgroundElementsAnimated />

      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto p-4 flex justify-center items-stretch gap-4 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-lg opacity-75" />
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                      <Link className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <span className="flex justify-center items-start gap-3">
                    <span>Room: </span>
                    <span className="break-all">{roomId}</span>
                  </span>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="pr-2"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          roomId || "roomid missing",
                        )
                        toast.success("Room ID Copied", {
                          description: "Room ID has been copied to clipboard",
                        })
                      }}
                      className="h-8 px-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate({ to: "/" })
                    }}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-white/30 dark:border-gray-600/30 hover:bg-white/90 dark:hover:bg-gray-700/90 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Leave
                  </Button>
                </motion.div>
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    {getStatusIcon}
                  </motion.div>
                  <span className="text-gray-600 dark:text-gray-300">
                    {status}
                  </span>
                  <motion.span
                    className={`h-2 w-2 rounded-full ${getStatusColor}`}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  />
                </div>
                {userName && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    <span>{userName}</span>
                  </div>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <FileUpload />

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={sendFile}
                  disabled={!file || isSending || !isConnected}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
                >
                  {isSending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="mr-3"
                      >
                        <Clock className="w-5 h-5" />
                      </motion.div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-3" />
                      Send File
                    </>
                  )}
                </Button>
              </motion.div>

              <ProgressSection
                isSending={isSending}
                transferProgress={transferProgress}
                file={file}
                receivedFileInfo={receivedFileInfo}
              />

              {/* Connection Status Info */}
              <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isConnected
                    ? "🔒 Secure peer-to-peer connection established"
                    : "⏳ Establishing secure connection..."}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Remote users sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="hidden md:flex w-64 flex-col rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-700/40 shadow-xl backdrop-blur-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                Connected peers
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Object.keys(remoteUsers || {}).length}
            </span>
          </div>

          <div className="flex-1 rounded-xl bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 p-2 overflow-y-auto max-h-[60vh] space-y-2">
            {Object.keys(remoteUsers || {}).length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                No remote users connected yet.
              </p>
            ) : (
              Object.entries(remoteUsers).map(([id, name]) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg bg-white/90 dark:bg-gray-900/90 px-2 py-2 shadow-sm border border-gray-200/70 dark:border-gray-700/70"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-semibold text-white">
                      {String(name || id)
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "?"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
                        {name || "Unknown"}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {id}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              ))
            )}
          </div>
        </motion.aside>
      </div>
    </div>
  )
}
