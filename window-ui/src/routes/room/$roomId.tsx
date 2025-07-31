import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
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
} from 'lucide-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { JoinRoomMessage } from '@/types'
import { useUserStore } from '@/store'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ThemeToggle } from '@/components/theme-toggle'

export const Route = createFileRoute('/room/$roomId')({
  component: Room,
})

const SIGNALING_SERVER_URL = 'ws://localhost:8080'

// Using public STUN servers. For production, you might need a TURN server.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const CHUNK_SIZE = 64 * 1024 // 64 KB chunk size

export default function Room() {
  const navigate = useNavigate()
  const { roomId } = Route.useParams()

  // Zustand store
  const { userId, userName, initializeUser, leaveRoom } = useUserStore()

  // Refs for core WebRTC objects
  const socketRef = useRef<WebSocket | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)

  // State management
  const [status, setStatus] = useState('Connecting to room...')
  const [isConnected, setIsConnected] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [transferProgress, setTransferProgress] = useState(0)
  const [receivedFile, setReceivedFile] = useState<{
    name: string
    url: string | null
  }>({ name: '', url: null })
  const [dragOver, setDragOver] = useState(false)

  // Refs for receiving file data
  const receivedChunksRef = useRef<Array<ArrayBuffer>>([])
  const receivedFileInfoRef = useRef<{
    name: string
    type: string
    size: number
  } | null>(null)

  useEffect(() => {
    // Initialize user and join room
    initializeUser()

    // 1. Initialize WebSocket connection

    // console.log('room id --> ', roomId)
    const socket = new WebSocket(SIGNALING_SERVER_URL)
    socketRef.current = socket

    socket.onopen = () => {
      setStatus('Joining room...')
      // Join the room automatically with user info
      socket.send(
        JSON.stringify({
          type: 'join-room',
          roomId: roomId,
          userId: userId, // sending user details as well
          userName: userName,
        } as JoinRoomMessage),
      )
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleSignalingMessage(message)
    }

    socket.onclose = () => {
      setStatus('Disconnected from server')
      setIsConnected(false)
    }

    socket.onerror = () => {
      toast.error('Connection Error', {
        description: 'Failed to connect to signaling server',
      })
      setStatus('Connection failed')
    }

    // Cleanup on component unmount
    return () => {
      socket.close()
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
      // Leave room and clear userId when navigating away
      leaveRoom()
    }
  }, [roomId, userId, userName, leaveRoom])

  const handleSignalingMessage = async (message: any) => {
    switch (message.type) {
      case 'user-joined':
        if (message.error) {
          toast.error('Failed to join room', {
            description: message.message,
          })
          navigate({ to: '/' })
        } else {
          setStatus('Waiting for another user...')
        }
        break

      case 'other-user-joined':
        toast.success('User Joined', {
          description: 'Another user has joined the room.',
        })
        setStatus('Ready to connect. Creating offer...')
        await createPeerConnection(true)
        break

      case 'webrtc-offer':
        setStatus('Receiving offer. Creating answer...')
        await createPeerConnection(false)
        await handleOffer(message.offer)
        break

      case 'webrtc-answer':
        await handleAnswer(message.answer)
        break

      case 'webrtc-ice-candidate':
        await handleIceCandidate(message.candidate)
        break

      case 'other-user-left':
        toast.error('User Left', {
          description: 'The other user has left the room.',
        })
        setStatus('Waiting for another user...')
        setIsConnected(false)
        resetConnection()
        break
    }
  }

  const createPeerConnection = async (isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: 'webrtc-ice-candidate',
            candidate: event.candidate,
            roomId: roomId,
          }),
        )
      }
    }

    pc.ondatachannel = (event) => {
      const channel = event.channel
      dataChannelRef.current = channel
      setupDataChannel(channel)
    }

    peerConnectionRef.current = pc

    if (isInitiator) {
      // The joining user (initiator) creates the data channel and the offer
      const dc = pc.createDataChannel('file-transfer')
      setupDataChannel(dc)
      dataChannelRef.current = dc

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      if (socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: 'webrtc-offer',
            offer: offer,
            roomId: roomId,
          }),
        )
      }
    }
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(offer),
      )
      const answer = await peerConnectionRef.current.createAnswer()
      await peerConnectionRef.current.setLocalDescription(answer)

      if (socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: 'webrtc-answer',
            answer: answer,
            roomId: roomId,
          }),
        )
      }
    }
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      )
      setStatus('Connection established! Ready to share.')
      setIsConnected(true)
    }
  }

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(
        new RTCIceCandidate(candidate),
      )
    }
  }

  const resetConnection = () => {
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    dataChannelRef.current = null
    setFile(null)
    setIsSending(false)
    setTransferProgress(0)
  }

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      setStatus('Connection established! Ready to share.')
      setIsConnected(true)
    }

    channel.onclose = () => {
      setStatus('Connection closed.')
      setIsConnected(false)
    }

    channel.onmessage = (event) => {
      handleReceiveMessage(event.data)
    }
  }

  // --- File Sending Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const sendFile = () => {
    if (
      !file ||
      !dataChannelRef.current ||
      dataChannelRef.current.readyState !== 'open'
    ) {
      toast.error('Cannot send file', {
        description: 'No file selected or connection not ready.',
      })
      return
    }

    setIsSending(true)
    setTransferProgress(0)

    // 1. Send metadata first
    const metadata = JSON.stringify({
      name: file.name,
      type: file.type,
      size: file.size,
    })
    dataChannelRef.current.send(metadata)

    // 2. Send file in chunks
    const fileReader = new FileReader()
    let offset = 0

    fileReader.onload = (e) => {
      if (e.target?.result) {
        dataChannelRef.current?.send(e.target.result as ArrayBuffer)
        offset += (e.target.result as ArrayBuffer).byteLength
        setTransferProgress((offset / file.size) * 100)

        if (offset < file.size) {
          readSlice(offset)
        } else {
          toast.success('File Sent', {
            description: `${file.name} has been sent successfully.`,
          })
          setIsSending(false)
          setFile(null) // Clear file input after sending
        }
      }
    }

    const readSlice = (o: number) => {
      const slice = file.slice(o, o + CHUNK_SIZE)
      fileReader.readAsArrayBuffer(slice)
    }

    readSlice(0)
  }

  // --- File Receiving Logic ---
  const handleReceiveMessage = (data: any) => {
    // If data is a string, it's metadata.
    if (typeof data === 'string') {
      const metadata = JSON.parse(data)
      receivedFileInfoRef.current = metadata
      receivedChunksRef.current = [] // Reset for new file
      setTransferProgress(0)
      toast.success('Incoming File', {
        description: `Receiving ${metadata.name} (${(metadata.size / 1024 / 1024).toFixed(2)} MB)`,
      })
      return
    }

    // Otherwise, it's a file chunk (ArrayBuffer)
    receivedChunksRef.current.push(data)
    const receivedSize = receivedChunksRef.current.reduce(
      (acc, chunk) => acc + chunk.byteLength,
      0,
    )

    if (receivedFileInfoRef.current) {
      setTransferProgress(
        (receivedSize / receivedFileInfoRef.current.size) * 100,
      )

      // If all chunks received, assemble the file
      if (receivedSize === receivedFileInfoRef.current.size) {
        const fileBlob = new Blob(receivedChunksRef.current, {
          type: receivedFileInfoRef.current.type,
        })
        const url = URL.createObjectURL(fileBlob)
        setReceivedFile({ name: receivedFileInfoRef.current.name, url })

        toast.success('File Received', {
          description: `${receivedFileInfoRef.current.name} has been received.`,
        })

        // Auto-download
        const a = document.createElement('a')
        a.href = url
        a.download = receivedFileInfoRef.current.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        // Reset for next transfer
        receivedFileInfoRef.current = null
        setTransferProgress(0)
      }
    }
  }

  const getStatusIcon = () => {
    if (isConnected) return <Wifi className="w-4 h-4 text-green-500" />
    if (status.includes('Connecting') || status.includes('Joining'))
      return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
    if (status.includes('failed') || status.includes('Disconnected'))
      return <WifiOff className="w-4 h-4 text-red-500" />
    return <Users className="w-4 h-4 text-blue-500" />
  }

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500'
    if (status.includes('failed') || status.includes('Disconnected'))
      return 'bg-red-500'
    return 'bg-yellow-500'
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
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
            ease: 'linear',
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
            ease: 'linear',
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
                  Room: {roomId}
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      leaveRoom()
                      navigate({ to: '/' })
                    }}
                    className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-white/20 hover:bg-white/70 dark:hover:bg-gray-700/70"
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
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } ${!isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                  className={`cursor-pointer ${isSending || !isConnected ? 'cursor-not-allowed' : ''}`}
                >
                  <motion.div
                    animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FileUp className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                  </motion.div>
                  <span className="block text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {file ? file.name : 'Drop files here or click to select'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                      : 'Any file type, any size'}
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
                        setFile(null)
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
                          ease: 'linear',
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
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {isSending ? 'Sending' : 'Receiving'}:{' '}
                        {file?.name || receivedFileInfoRef.current?.name}
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
                    ? '🔒 Secure peer-to-peer connection established'
                    : '⏳ Establishing secure connection...'}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
