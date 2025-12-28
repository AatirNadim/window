import { useEffect, useMemo, useRef } from "react"
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
import FileUpload from "@/components/room/fileUpload"
import ProgressSection from "@/components/room/progress"
import { RemoteUsersPanel } from "@/components/room/remoteUsersPanel"
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn, isValidUUID } from "@/lib/utils"

export const Route = createFileRoute("/room/$rId")({
  component: Room,
})

export default function Room() {
  const { rId } = Route.useParams()

  const navigate = useNavigate()

  // Zustand store
  const { userId, roomId, userName, remoteUsers, setUserId, setRoomId } =
    useUserStore()

  const {
    filesToBeSent,
    receivedFileInfo,
    transferProgress,
    isSending,
    sendingFile,
  } = useFileStore()

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
  const cleanUpRef = useRef(cleanUp)

  useEffect(() => {
    if (!isValidUUID(rId.trim())) {
      cleanUp()
      navigate({ to: "/" })
      toast.error("Invalid Room ID Format", {
        description: "Please enter a valid UUID format room ID.",
      })
    }
    setRoomId(rId)
  }, [rId])

  useEffect(() => {
    if (isRoomFull) {
      navigate({ to: "/" })
    }
  }, [isRoomFull, navigate])

  useEffect(() => {
    console.log("room details:", { roomId, userId })
    if (!roomId) {
      console.log("roomid is not parsed yet..")
      return
    }
    if (!userId) {
      console.error(
        "userid is missing, probably from reload, setting new userid",
      )
      setUserId()
      return
    }

    console.debug("creating socket connection for room:", roomId)

    try {
      console.log(
        "Attempting to create WebSocket connection... with userid:",
        userId,
      )
      createWSConnection()
    } catch (error) {
      console.error(
        "In the room component, socket connection failed with error:",
        error,
      )
      navigate({ to: "/" })
    }
  }, [roomId, userId])

  // cleanupref will always have latest cleanUp function
  useEffect(() => {
    cleanUpRef.current = cleanUp
  }, [cleanUp])

  useEffect(() => {
    // 1. Handler to prompt the user before reloading/closing
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Setting returnValue triggers the browser's native confirmation dialog
      e.returnValue = ""
    }

    // 2. Handler to run cleanup ONLY when the page is actually unloading
    const handlePageHide = () => {
      cleanUpRef.current()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("pagehide", handlePageHide)

      // 3. Run cleanup on component unmount (SPA navigation)
      cleanUpRef.current()
    }
  }, [])

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
      <div className="min-h-screen relative overflow-hidden w-full flex items-start justify-center bg-white dark:bg-slate-900">

        <div className="absolute top-6 right-6 z-20">
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
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-2xl font-bold text-slate-900 dark:text-white">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="bg-blue-600 dark:bg-blue-500 p-2 rounded-lg shadow-lg shadow-blue-600/20 dark:shadow-blue-500/20">
                        <Link className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <span className="flex justify-center items-start gap-3">
                      <span>Room: </span>
                      <span className="break-all">{rId}</span>
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
                          navigator.clipboard.writeText(rId || "roomid missing")
                          toast.success("Room ID Copied", {
                            description: "Room ID has been copied to clipboard",
                          })
                        }}
                        className="h-8 px-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
                      className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-all duration-200 shadow-sm hover:shadow-md font-bold"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2 font-bold" />
                      <span className="font-extrabold">Leave</span>
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
                    <span className="text-slate-600 dark:text-slate-300">
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
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <User className="w-4 h-4" />
                      <span>{userName}</span>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <FileUpload isConnected={isConnected} />

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={sendFile}
                    disabled={
                      filesToBeSent.length === 0 || isSending || !isConnected
                    }
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 dark:shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/30 transition-all duration-300 text-lg"
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
                        Send Files ({filesToBeSent.length})
                      </>
                    )}
                  </Button>
                </motion.div>

                {/* TODO: check what file info needs to be displayed when sending multiple files over a no of channels */}
                <ProgressSection
                  isSending={isSending}
                  transferProgress={transferProgress}
                  file={sendingFile}
                  receivedFileInfo={receivedFileInfo}
                />

                {/* Connection Status Info */}
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Connected peers</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
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
