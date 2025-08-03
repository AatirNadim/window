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
  Copy,
} from 'lucide-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type {
  AnswerMessage,
  IceCandidateMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  OfferMessage,
  UserLeftMessage,
  WebSocketMessage,
} from '@/types'
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

const CHUNK_SIZE = 64 * 1024 // 64 KB chunk size

export default function Room() {
  const navigate = useNavigate()
  const { roomId } = Route.useParams()

  // Zustand store
  const {
    userId,
    userName,
    remoteUsers,
    initializeUser,
    leaveRoom,
    addRemoteUser,
    removeRemoteUser,
    clearRemoteUsers,
  } = useUserStore()

  // Refs for core WebRTC objects
  const socketRef = useRef<WebSocket | null>(null)
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})
  const dataChannelRef = useRef<RTCDataChannel | null>(null)

  // State management
  const [status, setStatus] = useState('Connecting to room...')

  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting')

  const [isConnected, setIsConnected] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [transferProgress, setTransferProgress] = useState(0)
  const [receivedFile, setReceivedFile] = useState<{
    name: string
    url: string | null
  }>({ name: '', url: null })
  const [dragOver, setDragOver] = useState(false)

  const serverPort: string = import.meta.env.VITE_SERVER_PORT || '8080'

  const serverPath = `${
    import.meta.env.VITE_SERVER_PATH || 'localhost'
  }:${serverPort}`

  // Refs for receiving file data
  const receivedChunksRef = useRef<Array<ArrayBuffer>>([])
  const receivedFileInfoRef = useRef<{
    name: string
    type: string
    size: number
  } | null>(null)

  const createWSConnection = () => {
    try {
      if (!userId || !userName) {
        console.error('User ID or Name is not initialized')
        return
      }

      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const socket = new WebSocket(`${wsProtocol}://${serverPath}`)
      socketRef.current = socket

      socket.onopen = () => {
        setStatus('Joining room...')

        const msg: JoinRoomMessage = {
          type: 'join-room',
          roomId,
          userId,
          userName,
        }

        console.log('Joining room with message: ', msg)
        // Join the room automatically with user info
        socket.send(JSON.stringify(msg))
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
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      toast.error('Connection Error', {
        description: 'Failed to connect to signaling server',
      })
      setStatus('Connection failed')
    }
  }

  useEffect(() => {
    console.info('\n\nRemote users updated:', remoteUsers, '\n\n')
  }, [remoteUsers])

  useEffect(() => {
    initializeUser()

    console.log('user details generated --> ', userId, userName)

    if (!userId || !userName) {
      toast.error('User Initialization Failed', {
        description:
          'Failed to initialize user details. Please refresh the page.',
      })
      return
    }

    console.debug('creating socket connection for room:', roomId)

    createWSConnection()
    window.addEventListener('beforeunload', cleanUp)

    return () => {
      // Leave room and clear userId when navigating away
      window.removeEventListener('beforeunload', cleanUp)
      cleanUp()
    }
  }, [roomId, userId])

  useEffect(() => {
    console.debug(
      '\n\nPeer connections updated:',
      peerConnections.current,
      '\n\n',
    )
  }, [peerConnections.current])

  const cleanUp = () => {
    try {
      Object.values(peerConnections.current).forEach((pc) => pc.close())
      socketRef.current?.send(
        JSON.stringify({
          type: 'leave-room',
          roomId,
          userId,
        } as LeaveRoomMessage),
      )
      socketRef.current?.close()
      clearRemoteUsers()
      leaveRoom()
    } catch (error) {
      console.error('Error cleaning up WebSocket connection:', error)
    }
  }

  const handleSignalingMessage = async (message: WebSocketMessage) => {
    console.debug('Received signaling message: ', message)
    switch (message.type) {
      case 'user-joined':
        createPeerConnection(message.userId, message.userName)

        await createOffer(message.userId)

        toast.success('New User Joined', {
          description: `A new user, ${message.userName}, with ID ${message.userId} joined the room.`,
        })

        setStatus('A user has joined the room')
        break

      case 'offer':
        await handleOffer(message)

        break

      case 'answer':
        await handleAnswer(message)
        break

      case 'ice-candidate':
        await handleIceCandidate(message)
        break

      case 'user-left':
        handleRemoteUserLeft(message)

        toast.error('User Left', {
          description: 'The other user has left the room.',
        })
        break

      case 'error':
        toast.error('Error', {
          description: message.message || 'An error occurred',
        })
        setStatus('Connection failed')
        setIsConnected(false)
        // resetConnection()
        break
    }
  }

  const sendWsMessage = (message: WebSocketMessage) => {
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(message))
      } else {
        console.error('WebSocket is not open. Cannot send message.')
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error)
    }
  }

  const createPeerConnection = (
    remoteUserId: string,
    remoteUserName: string,
  ) => {
    try {
      console.debug(
        'Creating new RTCPeerConnection with remote user ID:',
        remoteUserId,
        remoteUserName,
      )

      if (!userId || !userName) {
        throw new Error('User not initialized')
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
            ],
          },
        ],
        iceCandidatePoolSize: 10,
      })

      // registering peer connection event handlers

      pc.onicecandidate = (event) => {
        console.log(
          'sending ice candidate for user:',
          remoteUserId,
          event.candidate,
          socketRef.current,
        )

        if (event.candidate && socketRef.current) {
          console.debug(
            'Sending ICE candidate:',
            event.candidate,
            'to remote user:',
            remoteUserId,
          )
          sendWsMessage({
            type: 'ice-candidate',
            roomId,
            fromUserId: userId,
            toUserId: remoteUserId,
            candidate: event.candidate,
          })
        }
      }

      // Add after pc.onconnectionstatechange

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case 'connected':
            if (remoteUsers[remoteUserId]) return
            console.debug(
              `Connection established with remote user ${remoteUserId}`,
            )
            addRemoteUser(remoteUserId, remoteUserName)
            setIsConnected(true)
            setStatus('Connected to remote user')
            break
          case 'disconnected':
          case 'failed':
            console.warn(
              `Connection with remote user ${remoteUserId} lost. Attempting to reconnect...`,
            )
            setConnectionStatus('connecting')
            removeRemoteUser(remoteUserId)
            setStatus(`Reconnecting to ${remoteUserId}...`)
            break
          case 'closed':
            console.warn(`Connection with remote user ${remoteUserId} closed.`)
            setIsConnected(false)
            setStatus('Connection closed')

            clearRemoteUsers()
            break
          default:
            console.debug(
              `Unhandled behaviour: Connection state with remote user ${remoteUserId}: ${pc.connectionState}`,
            )
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.debug(
          `ICE connection state with ${remoteUserId}: ${pc.iceConnectionState}`,
        )

        if (pc.iceConnectionState === 'failed') {
          console.error('ICE connection failed, attempting restart')
          pc.restartIce()
        }
      }

      pc.onicegatheringstatechange = () => {
        console.debug(
          `ICE gathering state with ${remoteUserId}: ${pc.iceGatheringState}`,
        )
      }

      pc.ondatachannel = (event) => {
        const channel = event.channel
        dataChannelRef.current = channel
        setupDataChannel(channel)
      }

      pc.onconnectionstatechange = () => {
        console.debug(
          `Connection state with remote user ${remoteUserId} changed: ${pc.connectionState}`,
        )

        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed'
        ) {
          console.warn(
            `Connection with remote user ${remoteUserId} lost. Attempting to reconnect...`,
          )
          setConnectionStatus('connecting')
          // setStatus(`Reconnecting to ${remoteUserId}...`)
        }

        setConnectionStatus(
          pc.connectionState as 'connecting' | 'connected' | 'disconnected',
        )
      }

      peerConnections.current[remoteUserId] = pc

      console.info(
        'new peer connection created and added to records for user:',
        remoteUserId,
      )
    } catch (error) {
      console.error('Error creating peer connection:', error)
      toast.error('Peer Connection Failed', {
        description: 'Failed to create WebRTC peer connection.',
      })
      setStatus('Peer connection failed')
    }
  }

  const createOffer = async (remoteUserId: string) => {
    try {
      if (!userId || !userName) {
        throw new Error('User not initialized')
      }

      if (!peerConnections.current[remoteUserId]) {
        throw new Error(`Peer connection not found for user: ${remoteUserId}`)
      }

      const pc = peerConnections.current[remoteUserId]

      // setting up data channel for file transfer

      console.debug(
        'Creating data channel for file transfer with remote user:',
        remoteUserId,
      )

      const dataChannel = pc.createDataChannel('fileTransfer', {
        ordered: true,
      })
      dataChannelRef.current = dataChannel
      setupDataChannel(dataChannel)

      console.debug('Creating offer for remote user:', remoteUserId)

      const offer = await pc.createOffer()

      console.debug('Setting local description with offer:', offer)

      await pc.setLocalDescription(offer)

      sendWsMessage({
        type: 'offer',
        fromUserId: userId,
        toUserId: remoteUserId,
        offer,
        roomId,
      })
      console.debug('Offer sent to remote user:', remoteUserId)
    } catch (error) {
      console.error('Error creating offer:', error)
      toast.error('Offer Creation Failed', {
        description: 'Failed to create WebRTC offer.',
      })
      setStatus('Offer creation failed')
    }
  }

  const handleOffer = async (msg: OfferMessage) => {
    try {
      if (!userId) {
        throw new Error('User not initialized')
      }

      const { fromUserId, offer } = msg
      let pc = peerConnections.current[fromUserId]

      // creating peer connection for the first time with the existing client, when they send an offer
      if (!pc) {
        createPeerConnection(msg.fromUserId, msg.fromUserName)
        pc = peerConnections.current[fromUserId]
      }

      console.debug('Handling offer from remote user:', fromUserId)
      console.debug('Received offer:', offer)

      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      console.debug('Remote description set with offer:', offer)

      // Create an answer to send back
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      console.debug('Created answer:', answer)

      sendWsMessage({
        type: 'answer',
        roomId,
        fromUserId: userId,
        toUserId: fromUserId,
        answer,
      })
    } catch (error) {
      console.error('Error handling offer:', error)
      toast.error('Offer Handling Failed', {
        description: 'Failed to handle WebRTC offer.',
      })
      setStatus('Offer handling failed')
    }
  }

  const handleAnswer = async (msg: AnswerMessage) => {
    try {
      if (!peerConnections.current[msg.fromUserId]) {
        throw new Error(`Peer connection not found for user: ${msg.fromUserId}`)
      }

      const pc = peerConnections.current[msg.fromUserId]

      console.debug('Handling answer from remote user:', msg.fromUserId)

      console.debug('Received answer:', msg.answer)

      await pc.setRemoteDescription(new RTCSessionDescription(msg.answer))

      console.debug('Remote description set with answer:', msg.answer)
      setIsConnected(true)
    } catch (error) {
      console.error('Error handling answer:', error)
      toast.error('Answer Handling Failed', {
        description: 'Failed to handle WebRTC answer.',
      })
      setStatus('Answer handling failed')
    }
  }

  const handleIceCandidate = async (msg: IceCandidateMessage) => {
    try {
      if (!peerConnections.current[msg.fromUserId]) {
        throw new Error(`Peer connection not found for user: ${msg.fromUserId}`)
      }

      const pc = peerConnections.current[msg.fromUserId]

      if (!pc.remoteDescription) {
        console.warn('Remote description not set yet, waiting for offer/answer')
        return
      }

      console.debug('Handling ICE candidate from remote user:', msg.fromUserId)

      console.debug('Received ICE candidate:', msg.candidate)

      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))

      console.debug('ICE candidate added to peer connection:', msg.candidate)
    } catch (error) {
      console.error('Error handling ICE candidate:', error)
      // toast.error('ICE Candidate Handling Failed', {
      //   description: 'Failed to handle WebRTC ICE candidate.',
      // })
      setStatus('ICE candidate handling failed')
    }
  }

  const handleRemoteUserLeft = (msg: UserLeftMessage) => {
    const remoteUserId = msg.userId
    try {
      peerConnections.current[remoteUserId]?.close()
      delete peerConnections.current[remoteUserId]

      console.debug(
        `Remote user ${remoteUserId} has left the room. Peer connection closed.`,
      )

      toast.info('Remote User Left', {
        description: `User with ID ${remoteUserId} has left the room.`,
      })
    } catch (error) {
      console.error('Error handling remote user left:', error)
      toast.error('Remote User Left', {
        description: `User with ID ${remoteUserId} has left the room.`,
      })
    }
  }

  // const resetConnection = () => {
  //   Object.values(peerConnections.current).forEach((pc) => {
  //     pc.close()
  //   })
  //   peerConnections.current = {}
  //   dataChannelRef.current = null
  //   setFile(null)
  //   setIsSending(false)
  //   setTransferProgress(0)
  // }

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

    toast('Sending file...', {
      description: `Sending ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
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
                        toast.success('Room ID Copied', {
                          description: 'Room ID has been copied to clipboard',
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
                      navigate({ to: '/' })
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
