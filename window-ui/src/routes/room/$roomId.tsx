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
import { RemoteUsersPanel } from "@/components/room/remoteUsersPanel"
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

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
    isRoomFull,
  } = useSocket()

  const { sendFile } = useFile({ peerConnections, dataChannelMap })

  useEffect(() => {
    if (isRoomFull) {
      navigate({ to: "/" })
    }
  }, [isRoomFull, navigate])

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

  const remoteUserCount = Object.keys(remoteUsers || {}).length

  return (
    <SidebarProvider>
      <Sidebar side="left" className="hidden md:flex">
        {/* <SidebarHeader>Remote Users</SidebarHeader> */}
        <SidebarContent>
          <RemoteUsersPanel remoteUsers={remoteUsers} />
        </SidebarContent>
      </Sidebar>
      <div className="min-h-screen relative overflow-hidden w-full flex items-start justify-center">
        {/* Background with gradient */}
        <GradientBackground />

        {/* Animated background elements */}
        <BackgroundElementsAnimated />

        <div className="absolute top-6 right-6 z-10">
          <ThemeToggle />
        </div>
        <SidebarTrigger className="hidden md:flex z-20 " />

        {/* Main content */}
        <div
          className={cn(
            "relative z-10 container mx-auto p-4 flex flex-col gap-4 min-h-screen justify-center items-center",
            // mainPaddingClass,
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full md:max-w-2xl mx-auto md:mx-0 "
          >
            <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                  <div className="flex items-start gap-3">
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

          {/* Mobile: remote users sheet trigger */}
          <div className="md:hidden w-full flex justify-end mt-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-white/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-200"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Connected peers from sheet</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {remoteUserCount}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"

                // className="w-72 max-w-full p-4 flex flex-col gap-4"
              >
                {/* <SheetHeader>
                  <SheetTitle>Connected peers from sheet</SheetTitle>
                </SheetHeader> */}
                {/* <div className="flex-1 min-h-0"> */}
                <RemoteUsersPanel remoteUsers={remoteUsers} />
                {/* </div> */}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
