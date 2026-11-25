import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Link2,
  Send,
  Users,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useUserStore } from "@/store"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyboardShortcutsButton } from "@/components/keybindings/KeyboardShortcutsButton"
import { Kbd } from "@/components/keybindings/Kbd"
import { useTheme } from "@/components/theme-provider"
import { useFileStore } from "@/store/fileStore"
import { useFile } from "@/store/hooks/fileHook"
import { useSocket } from "@/store/hooks/socketHook"
import { useKeybindings } from "@/hooks/useKeybindings"
import FileUpload from "@/components/room/fileUpload"
import ProgressSection from "@/components/room/progress"
import { RemoteUsersPanel } from "@/components/room/remoteUsersPanel"
import { PullSharingPanel } from "@/components/room/pullSharingPanel"
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn, isValidUUID } from "@/lib/utils"

export const Route = createFileRoute("/room/$rId")({
  component: Room,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Private sharing room — Window" },
    ],
  }),
})

export default function Room() {
  const { rId } = Route.useParams()
  const navigate = useNavigate()
  const { userId, roomId, userName, remoteUsers, setUserId, setRoomId } =
    useUserStore()
  const { theme, setTheme } = useTheme()
  const [peersSheetOpen, setPeersSheetOpen] = useState(false)
  const {
    filesToBeSent,
    receivedFileInfo,
    transferProgress,
    isSending,
    sendingFile,
    clearFilesToBeSent,
  } = useFileStore()
  const {
    dataChannelMap,
    isConnected,
    status,
    createWSConnection,
    peerConnections,
    cleanUp,
    isRoomFull,
    requestFilePull,
    cancelFilePull,
    publishFileOffer,
    revokeFileOffer,
  } = useSocket()
  const { sendFile } = useFile({ peerConnections, dataChannelMap })
  const cleanUpRef = useRef(cleanUp)
  const reducedMotion = useReducedMotion()
  const remoteUserCount = Object.keys(remoteUsers || {}).length
  const isConnecting =
    status.includes("Connecting") || status.includes("Joining")
  const isFailed =
    status.toLowerCase().includes("failed") || status.includes("Disconnected")
  const connectionLabel = isConnected
    ? "Connected"
    : isFailed
      ? status
      : isConnecting
        ? status
        : status || "Waiting for a peer"
  const StatusIcon = isConnected ? Wifi : isFailed ? WifiOff : Clock3
  const statusTone = isConnected
    ? "text-success bg-success/10"
    : isFailed
      ? "text-destructive bg-destructive/10"
      : "text-warning bg-warning/10"

  useEffect(() => {
    if (!isValidUUID(rId.trim())) {
      cleanUp()
      navigate({ to: "/" })
      toast.error("Invalid Room ID Format", {
        description: "Please enter a valid UUID format room ID.",
      })
      return
    }
    setRoomId(rId)
  }, [rId])

  useEffect(() => {
    if (isRoomFull) navigate({ to: "/" })
  }, [isRoomFull, navigate])

  useEffect(() => {
    if (!roomId) return
    if (!userId) {
      setUserId()
      return
    }
    try {
      createWSConnection()
    } catch (error) {
      console.error("Room connection failed:", error)
      navigate({ to: "/" })
    }
  }, [roomId, userId])

  useEffect(() => {
    cleanUpRef.current = cleanUp
  }, [cleanUp])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    const handlePageHide = () => cleanUpRef.current()
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("pagehide", handlePageHide)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("pagehide", handlePageHide)
      cleanUpRef.current()
    }
  }, [])

  const copyText = async (value: string, success: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(success)
    } catch {
      const input = document.createElement("textarea")
      input.value = value
      input.style.position = "fixed"
      input.style.opacity = "0"
      document.body.appendChild(input)
      input.select()
      const copied = document.execCommand("copy")
      input.remove()
      if (copied) toast.success(success)
      else
        toast.error("Could not copy", {
          description: "Select and copy the room ID manually.",
        })
    }
  }

  const handleOpenFileInput = () => {
    const fileInput = document.getElementById("file-input") as HTMLInputElement | null
    if (fileInput && !isSending && isConnected) {
      fileInput.click()
    } else if (!isConnected) {
      toast.info("Waiting for a peer", {
        description: "Connect to a peer before selecting files to send.",
      })
    }
  }

  const handleOpenOfferInput = () => {
    const offerInput = document.getElementById("offer-file-input") as HTMLInputElement | null
    if (offerInput) {
      offerInput.click()
    }
  }

  // Register Room screen keybindings
  useKeybindings([
    {
      keys: ["u", "f", "Alt+U"],
      handler: handleOpenFileInput,
      allowInInput: false,
    },
    {
      keys: ["s", "Alt+S"],
      handler: () => {
        if (filesToBeSent.length > 0 && !isSending && isConnected) {
          sendFile()
        } else if (!isConnected) {
          toast.info("Waiting for peer connection", {
            description: "A peer connection must be established before sending files.",
          })
        } else if (filesToBeSent.length === 0) {
          toast.info("No files selected", {
            description: "Press 'U' to select files first.",
          })
        }
      },
      allowInInput: false,
    },
    {
      keys: ["x", "Alt+X"],
      handler: () => {
        if (filesToBeSent.length > 0 && !isSending) {
          clearFilesToBeSent()
          toast.info("Cleared selected files")
        }
      },
      allowInInput: false,
    },
    {
      keys: ["r", "Alt+R"],
      handler: () => copyText(rId, "Room ID copied"),
      allowInInput: false,
    },
    {
      keys: ["i", "Alt+I"],
      handler: () => copyText(window.location.href, "Invite link copied"),
      allowInInput: false,
    },
    {
      keys: ["p", "Alt+P"],
      handler: () => {
        setPeersSheetOpen((prev) => !prev)
      },
      allowInInput: false,
    },
    {
      keys: ["o", "Alt+O"],
      handler: handleOpenOfferInput,
      allowInInput: false,
    },
    {
      keys: ["l", "h", "Alt+L", "Alt+H"],
      handler: () => navigate({ to: "/" }),
      allowInInput: false,
    },
    {
      keys: ["t", "Alt+T"],
      handler: () => setTheme(theme === "light" ? "dark" : "light"),
      allowInInput: false,
    },
  ])

  return (
    <SidebarProvider>
      <Sidebar side="left" className="room-sharing-sidebar hidden lg:flex">
        <SidebarContent>
          <RemoteUsersPanel remoteUsers={remoteUsers} />
        </SidebarContent>
      </Sidebar>
      <main className="relative isolate min-h-svh w-full min-w-0 bg-background">
        <div
          aria-hidden="true"
          className="room-dotted-background pointer-events-none absolute inset-0 z-0"
        />
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/" })}
            className="min-h-11 px-2 sm:px-3 gap-1.5"
          >
            <ArrowLeft size={17} />
            <span>Home</span>
            <Kbd className="hidden sm:inline-flex text-[10px] h-5 min-w-5">H</Kbd>
          </Button>
          <div className="flex items-center gap-2">
            <div className="lg:hidden">
              <Sheet open={peersSheetOpen} onOpenChange={setPeersSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-h-11 gap-2"
                    aria-label={`Show ${remoteUserCount} connected peers`}
                  >
                    <Users size={17} />
                    <span>Peers</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {remoteUserCount}
                    </span>
                    <Kbd className="text-[10px] h-5 min-w-5">P</Kbd>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(22rem,90vw)] p-3">
                  <SheetTitle className="sr-only">Connected peers</SheetTitle>
                  <RemoteUsersPanel remoteUsers={remoteUsers} />
                </SheetContent>
              </Sheet>
            </div>
            <KeyboardShortcutsButton />
            <ThemeToggle />
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            className="mx-auto w-full max-w-6xl"
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
              <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
                <CardHeader className="gap-5 border-b border-border p-5 sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">
                        Sharing room
                      </p>
                      <CardTitle className="mt-1 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                        Your files, together
                      </CardTitle>
                      <CardDescription className="mt-2 flex min-w-0 items-center gap-2 text-sm">
                        <span
                          className={cn(
                            "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 font-medium",
                            statusTone,
                          )}
                          aria-live="polite"
                        >
                          <StatusIcon size={15} aria-hidden="true" />
                          {connectionLabel}
                        </span>
                        {userName && (
                          <span className="flex min-w-0 items-center gap-1.5 truncate">
                            <UserRound size={14} />
                            <span className="truncate">{userName}</span>
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="min-h-11 gap-1.5"
                        onClick={() => copyText(rId, "Room ID copied")}
                      >
                        <Copy size={15} />
                        <span>Copy ID</span>
                        <Kbd className="hidden md:inline-flex text-[10px] h-5 min-w-5">R</Kbd>
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11 gap-1.5"
                        onClick={() =>
                          copyText(window.location.href, "Invite link copied")
                        }
                      >
                        <Link2 size={15} />
                        <span>Copy invite</span>
                        <Kbd className="hidden md:inline-flex text-[10px] h-5 min-w-5">I</Kbd>
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-11 text-destructive hover:text-destructive gap-1.5"
                        onClick={() => navigate({ to: "/" })}
                      >
                        <span>Leave</span>
                        <Kbd className="hidden md:inline-flex text-[10px] h-5 min-w-5">L</Kbd>
                      </Button>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/70 px-3 py-2.5">
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      Room ID
                    </span>
                    <code
                      className="min-w-0 flex-1 truncate text-xs text-foreground sm:text-sm"
                      title={rId}
                    >
                      {rId}
                    </code>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {remoteUserCount}{" "}
                      {remoteUserCount === 1 ? "peer" : "peers"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 p-5 sm:p-7">
                  <div>
                    <h2 className="text-base font-semibold">Send files</h2>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      Files are shared with everyone connected to this room.
                    </p>
                  </div>
                  <FileUpload isConnected={isConnected} />
                  <Button
                    onClick={sendFile}
                    disabled={
                      filesToBeSent.length === 0 || isSending || !isConnected
                    }
                    className="min-h-12 w-full justify-center gap-2 rounded-lg text-base font-semibold"
                  >
                    {isSending ? (
                      <>
                        <Clock3 size={18} className="animate-spin" />
                        <span>Sending files…</span>
                      </>
                    ) : (
                      <>
                        <Send size={17} />
                        <span>
                          Send{" "}
                          {filesToBeSent.length
                            ? `${filesToBeSent.length} ${filesToBeSent.length === 1 ? "file" : "files"}`
                            : "files"}
                        </span>
                        <Kbd className="ml-1 text-[10px] h-5 min-w-5 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                          S
                        </Kbd>
                      </>
                    )}
                  </Button>
                  {!isConnected && (
                    <p className="text-center text-sm text-muted-foreground">
                      {isFailed
                        ? "Connection ended. You can wait for a peer or leave and rejoin."
                        : "Connect to a peer before selecting files to send."}
                    </p>
                  )}

                  <ProgressSection
                    isSending={isSending}
                    transferProgress={transferProgress}
                    file={sendingFile}
                    receivedFileInfo={receivedFileInfo}
                  />
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm leading-5 text-muted-foreground">
                    {isConnected ? (
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-success"
                      />
                    ) : (
                      <WifiOff size={16} className="mt-0.5 shrink-0" />
                    )}
                    <p>
                      {isConnected
                        ? "Peer connection ready. File contents travel over the WebRTC connection; connection routing can depend on your network."
                        : "Waiting for a peer connection. Some networks may need relay support before a transfer can start."}
                    </p>
                  </div>
                </CardContent>
              </Card>
              {userId && userName && (
                <PullSharingPanel
                  roomId={rId}
                  userId={userId}
                  userName={userName}
                  remoteUsers={remoteUsers}
                  onPublish={publishFileOffer}
                  onPull={requestFilePull}
                  onCancel={cancelFilePull}
                  onRevoke={revokeFileOffer}
                />
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </SidebarProvider>
  )
}
