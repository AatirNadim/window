import { useEffect, useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileUp,
  Link,
  XCircle,
  Send,
  Wifi,
  WifiOff,
  ArrowLeft,
  CheckCircle,
  Clock,
  Users,
  User,
  Copy,
} from "lucide-react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { LeaveRoomMessage } from "@/types"
import { useUserStore } from "@/store"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ThemeToggle } from "@/components/theme-toggle"
import { useFileStore } from "@/store/fileStore"
import { useFile } from "@/store/hooks/fileHook"
import { useSocket } from "@/store/hooks/socketHook"

export const Route = createFileRoute("/room/$roomId")({
  component: Room,
})

export default function Room() {
  const navigate = useNavigate()

  // Zustand store
  const { userId, userName, leaveRoom, clearRemoteUsers, roomId, setRoomId } =
    useUserStore()

  const {
    file,
    receivedFileInfo,
    setFile,
    transferProgress,
    isSending,
    resetFileStore,
  } = useFileStore()

  const {
    socketRef,
    dataChannelMap,
    isConnected,
    status,
    createWSConnection,
    peerConnections,
  } = useSocket()

  const { sendFile } = useFile({ peerConnections, dataChannelMap })

  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    console.debug("Transfer progress updated:", transferProgress)
  }, [transferProgress])

  useEffect(() => {
    console.log("sending state changed:", isSending)
  }, [isSending])

  useEffect(() => {
    if (!userId || !userName) {
      toast.error("User Initialization Failed", {
        description:
          "Failed to initialize user details. Please refresh the page.",
      })
      return
    }

    console.debug("creating socket connection for room:", roomId)

    createWSConnection()
    window.addEventListener("beforeunload", cleanUp)

    return () => {
      // Leave room and clear userId when navigating away
      window.removeEventListener("beforeunload", cleanUp)
      cleanUp()
    }
  }, [roomId, userId])

  const cleanUp = () => {
    try {
      Object.values(peerConnections.current).forEach((pc) => pc.close())

      console.log("leaving room:", roomId)

      socketRef.current?.send(
        JSON.stringify({
          type: "leave-room",
          roomId,
          userId,
        } as LeaveRoomMessage),
      )
      socketRef.current?.close()
      clearRemoteUsers()
      setRoomId(null)
      resetFileStore() // Reset file state when leaving room
      leaveRoom()
    } catch (error) {
      console.error("Error cleaning up WebSocket connection:", error)
    }
  }

  // --- File Sending Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetFileStore()

    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      setFile(files[0])
    }
  }

  const getStatusIcon = () => {
    if (isConnected) return <Wifi className="w-4 h-4 text-green-500" />
    if (status.includes("Connecting") || status.includes("Joining"))
      return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
    if (status.includes("failed") || status.includes("Disconnected"))
      return <WifiOff className="w-4 h-4 text-red-500" />
    return <Users className="w-4 h-4 text-blue-500" />
  }

  const getStatusColor = () => {
    if (isConnected) return "bg-green-500"
    if (status.includes("failed") || status.includes("Disconnected"))
      return "bg-red-500"
    return "bg-yellow-500"
  }

  return (
    <div className="min-h-screen relative overflow-hidden min-w-lg">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
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
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
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
      <div className="relative z-10 container mx-auto p-4 flex justify-center items-center min-h-screen">
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
                  <span>Room: {roomId}</span>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="pr-2"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(roomId)
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
                    {getStatusIcon()}
                  </motion.div>
                  <span className="text-gray-600 dark:text-gray-300">
                    {status}
                  </span>
                  <motion.span
                    className={`h-2 w-2 rounded-full ${getStatusColor()}`}
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
              {/* File Upload Area */}
              <motion.div
                className={`relative p-8 border-2 border-dashed rounded-xl text-center transition-all duration-300 ${
                  dragOver
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                } ${!isConnected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                whileHover={isConnected ? { scale: 1.02 } : {}}
                whileTap={isConnected ? { scale: 0.98 } : {}}
              >
                <input
                  type="file"
                  id="file-input"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isSending || !isConnected}
                />
                <label
                  htmlFor="file-input"
                  className={`cursor-pointer ${isSending || !isConnected ? "cursor-not-allowed" : ""}`}
                >
                  <motion.div
                    animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FileUp className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                  </motion.div>
                  <span className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {file ? file.name : "Drop files here or click to select"}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                      : "Any file type, any size"}
                  </span>
                </label>

                <AnimatePresence>
                  {file && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="absolute top-3 right-3 p-1 rounded-full bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      onClick={(e) => {
                        e.preventDefault()
                        resetFileStore()
                      }}
                    >
                      <XCircle className="h-5 w-5 text-red-500" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Send Button */}
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

              {/* Progress Section */}
              <AnimatePresence>
                {(isSending || transferProgress > 0) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {isSending ? "Sending" : "Receiving"}:{" "}
                        {file?.name || receivedFileInfo?.name}
                      </p>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {Math.round(transferProgress)}%
                      </span>
                    </div>
                    <Progress
                      value={transferProgress}
                      className="h-3 bg-white/50 dark:bg-gray-800/50"
                    />
                    {transferProgress === 100 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center text-green-600 dark:text-green-400"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="font-medium">Transfer Complete!</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

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
      </div>
    </div>
  )
}
