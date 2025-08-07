import { useRef, useState } from "react"
import { useUserStore } from "../userStore"
import { serverPath } from "@/lib/constants"
import type {
  AnswerMessage,
  IceCandidateMessage,
  JoinRoomMessage,
  OfferMessage,
  UserLeftMessage,
  WebSocketMessage,
} from "@/types"

import { toast } from "sonner"
import { useFileStore } from "../fileStore"

export const useSocket = () => {
  const socketRef = useRef<WebSocket | null>(null)
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})
  const dataChannelRef = useRef<RTCDataChannel | null>(null)

  const [status, setStatus] = useState("Connecting to room...")
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting")

  const {
    userId,
    userName,
    roomId,
    remoteUsers,
    addRemoteUser,
    removeRemoteUser,
    clearRemoteUsers,
  } = useUserStore()

  const {
    receivedFile,
    setTransferProgress,
    receivedFileInfo,
    setReceivedFileInfo,
    addReceivedChunk,
    clearReceivedChunks,
    receivedChunks,
    setReceivedFile,
  } = useFileStore()

  const createWSConnection = () => {
    try {
      if (!userId || !userName) {
        console.error("User ID or Name is not initialized")
        return
      }

      if (!roomId) {
        console.error("Room ID is not set")
        return
      }

      console.log("room created with ID:", roomId)

      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws"
      const socket = new WebSocket(`${wsProtocol}://${serverPath}`)
      socketRef.current = socket

      socket.onopen = () => {
        setStatus("Joining room...")

        const msg: JoinRoomMessage = {
          type: "join-room",
          roomId,
          userId,
          userName,
        }

        console.log("Joining room with message: ", msg)
        // Join the room automatically with user info
        socket.send(JSON.stringify(msg))
      }

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        handleSignalingMessage(message)
      }

      socket.onclose = () => {
        setStatus("Disconnected from server")
        setIsConnected(false)
      }

      socket.onerror = () => {
        toast.error("Connection Error", {
          description: "Failed to connect to signaling server",
        })
        setStatus("Connection failed")
      }
    } catch (error) {
      console.error("Error creating WebSocket connection:", error)
      toast.error("Connection Error", {
        description: "Failed to connect to signaling server",
      })
      setStatus("Connection failed")
    }
  }

  const handleSignalingMessage = async (message: WebSocketMessage) => {
    console.debug("Received signaling message: ", message)
    switch (message.type) {
      case "user-joined":
        createPeerConnection(message.userId, message.userName)

        await createOffer(message.userId)

        toast.success("New User Joined", {
          description: `A new user, ${message.userName}, with ID ${message.userId} joined the room.`,
        })

        setStatus("A user has joined the room")
        break

      case "offer":
        await handleOffer(message)

        break

      case "answer":
        await handleAnswer(message)
        break

      case "ice-candidate":
        await handleIceCandidate(message)
        break

      case "user-left":
        handleRemoteUserLeft(message)

        toast.error("User Left", {
          description: "The other user has left the room.",
        })
        break

      case "error":
        toast.error("Error", {
          description: message.message || "An error occurred",
        })
        setStatus("Connection failed")
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
        console.error("WebSocket is not open. Cannot send message.")
      }
    } catch (error) {
      console.error("Error sending WebSocket message:", error)
    }
  }

  const createPeerConnection = (
    remoteUserId: string,
    remoteUserName: string,
  ) => {
    try {
      console.debug(
        "Creating new RTCPeerConnection with remote user ID:",
        remoteUserId,
        remoteUserName,
      )

      if (!userId || !userName) {
        throw new Error("User not initialized")
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
            ],
          },
        ],
        iceCandidatePoolSize: 10,
      })

      // registering peer connection event handlers

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          console.debug("Sending ICE candidate:", "to remote user:")
          sendWsMessage({
            type: "ice-candidate",
            roomId,
            fromUserId: userId,
            toUserId: remoteUserId,
            candidate: event.candidate,
          })
        }
      }

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            if (remoteUsers[remoteUserId]) return
            console.debug(
              `Connection established with remote user ${remoteUserId}`,
            )
            addRemoteUser(remoteUserId, remoteUserName)
            setIsConnected(true)
            setStatus("Connected to remote user")
            break
          case "disconnected":
          case "failed":
            console.warn(
              `Connection with remote user ${remoteUserId} lost. Attempting to reconnect...`,
            )
            setConnectionStatus("connecting")
            removeRemoteUser(remoteUserId)
            setStatus(`Reconnecting to ${remoteUserId}...`)
            break
          case "closed":
            console.warn(`Connection with remote user ${remoteUserId} closed.`)
            setIsConnected(false)
            setStatus("Connection closed")

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

        if (pc.iceConnectionState === "failed") {
          console.error("ICE connection failed, attempting restart")
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
        console.debug(
          `Data channel established with remote user ${remoteUserId}:`,
          channel,
        )

        setupDataChannel(channel)
      }

      pc.onconnectionstatechange = () => {
        console.debug(
          `Connection state with remote user ${remoteUserId} changed: ${pc.connectionState}`,
        )

        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          console.warn(
            `Connection with remote user ${remoteUserId} lost. Attempting to reconnect...`,
          )
          setConnectionStatus("connecting")
          // setStatus(`Reconnecting to ${remoteUserId}...`)
        }

        setConnectionStatus(
          pc.connectionState as "connecting" | "connected" | "disconnected",
        )
      }

      peerConnections.current[remoteUserId] = pc

      console.info(
        "new peer connection created and added to records for user:",
        remoteUserId,
      )
    } catch (error) {
      console.error("Error creating peer connection:", error)
      toast.error("Peer Connection Failed", {
        description: "Failed to create WebRTC peer connection.",
      })
      setStatus("Peer connection failed")
    }
  }

  const createOffer = async (remoteUserId: string) => {
    try {
      console.debug("Creating offer for remote user:", remoteUserId)

      if (!userId || !userName) {
        throw new Error("User not initialized")
      }

      if (!roomId) {
        throw new Error("Room ID is not set")
      }

      if (!peerConnections.current[remoteUserId]) {
        throw new Error(`Peer connection not found for user: ${remoteUserId}`)
      }

      const pc = peerConnections.current[remoteUserId]

      // setting up data channel for file transfer

      console.debug(
        "Creating data channel for file transfer with remote user:",
        remoteUserId,
      )

      const dataChannel = pc.createDataChannel("fileTransfer", {
        ordered: true,
      })
      dataChannelRef.current = dataChannel

      console.debug(
        "Data channel created at the time of creating the offer:",
        dataChannelRef.current,
      )

      setupDataChannel(dataChannel)

      console.debug("Creating offer for remote user:", remoteUserId)

      const offer = await pc.createOffer()

      console.debug("Setting local description with offer:", offer)

      await pc.setLocalDescription(offer)

      sendWsMessage({
        type: "offer",
        fromUserId: userId,
        toUserId: remoteUserId,
        offer,
        roomId,
      })
      console.debug("Offer sent to remote user:", remoteUserId)
    } catch (error) {
      console.error("Error creating offer:", error)
      toast.error("Offer Creation Failed", {
        description: "Failed to create WebRTC offer.",
      })
      setStatus("Offer creation failed")
    }
  }

  const handleOffer = async (msg: OfferMessage) => {
    try {
      if (!userId) {
        throw new Error("User not initialized")
      }

      console.log("Handling offer from remote user:", msg.fromUserId)

      const { fromUserId, offer } = msg
      let pc = peerConnections.current[fromUserId]

      // creating peer connection for the first time with the existing client, when they send an offer
      if (!pc) {
        createPeerConnection(msg.fromUserId, msg.fromUserName)
        pc = peerConnections.current[fromUserId]
        console.log("Created new peer connection for user:", fromUserId)
      }

      console.log("Handling offer from remote user:", fromUserId)
      console.log("Received offer:", offer)

      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      console.log("Remote description set with offer:", offer)

      // Create an answer to send back
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      console.log("Created answer:", answer)

      sendWsMessage({
        type: "answer",
        roomId,
        fromUserId: userId,
        toUserId: fromUserId,
        answer,
      })
    } catch (error) {
      console.error("Error handling offer:", error)
      toast.error("Offer Handling Failed", {
        description: "Failed to handle WebRTC offer.",
      })
      setStatus("Offer handling failed")
    }
  }

  const handleAnswer = async (msg: AnswerMessage) => {
    try {
      if (!peerConnections.current[msg.fromUserId]) {
        throw new Error(`Peer connection not found for user: ${msg.fromUserId}`)
      }

      const pc = peerConnections.current[msg.fromUserId]

      console.debug("Handling answer from remote user:", msg.fromUserId)

      console.debug("Received answer:", msg.answer)

      await pc.setRemoteDescription(new RTCSessionDescription(msg.answer))

      console.debug("Remote description set with answer:", msg.answer)
      setIsConnected(true)
    } catch (error) {
      console.error("Error handling answer:", error)
      toast.error("Answer Handling Failed", {
        description: "Failed to handle WebRTC answer.",
      })
      setStatus("Answer handling failed")
    }
  }

  const handleIceCandidate = async (msg: IceCandidateMessage) => {
    try {
      if (!peerConnections.current[msg.fromUserId]) {
        throw new Error(`Peer connection not found for user: ${msg.fromUserId}`)
      }

      const pc = peerConnections.current[msg.fromUserId]

      if (!pc.remoteDescription) {
        console.warn("Remote description not set yet, waiting for offer/answer")
        return
      }

      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))

      console.debug("ICE candidate added to peer connection")
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
      // toast.error('ICE Candidate Handling Failed', {
      //   description: 'Failed to handle WebRTC ICE candidate.',
      // })
      setStatus("ICE candidate handling failed")
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

      toast.info("Remote User Left", {
        description: `User with ID ${remoteUserId} has left the room.`,
      })
    } catch (error) {
      console.error("Error handling remote user left:", error)
      toast.error("Remote User Left", {
        description: `User with ID ${remoteUserId} has left the room.`,
      })
    }
  }

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      setStatus("Connection established! Ready to share.")
      setIsConnected(true)
    }

    channel.onclose = () => {
      setStatus("Connection closed.")
      setIsConnected(false)
    }

    channel.onmessage = (event) => {
      handleReceiveMessage(event.data)
    }
  }

  const handleReceiveMessage = (data: any) => {
    console.log("received data at the receiver:", data, typeof data)

    // If data is a string, it's metadata.
    if (typeof data === "string") {
      const metadata = JSON.parse(data)

      setReceivedFileInfo(metadata)
      clearReceivedChunks()
      setTransferProgress(0)
      toast.success("Incoming File", {
        description: `Receiving ${metadata.name} (${(metadata.size / 1024 / 1024).toFixed(2)} MB)`,
      })
      return
    }

    // Otherwise, it's a file chunk (ArrayBuffer)

    addReceivedChunk(data as ArrayBuffer)
    const receivedSize = receivedChunks.reduce(
      (acc, chunk) => acc + chunk.byteLength,
      0,
    )

    if (receivedFileInfo) {
      console.log("Received file metadata:", receivedFileInfo)
    } else {
      console.log(
        "No metadata received yet, waiting for metadata...",
        receivedFileInfo,
      )
    }

    if (receivedFileInfo) {
      setTransferProgress((receivedSize / receivedFileInfo.size) * 100)

      console.log(
        "received file size:",
        receivedSize,
        "expected size:",
        receivedFileInfo.size,
      )

      // If all chunks received, assemble the file
      if (receivedSize === receivedFileInfo.size) {
        const fileBlob = new Blob(receivedChunks, {
          type: receivedFileInfo.type,
        })
        const url = URL.createObjectURL(fileBlob)
        setReceivedFile({ name: receivedFileInfo.name, url })

        toast.success("File Received", {
          description: `${receivedFileInfo.name} has been received.`,
        })

        // Auto-download
        const a = document.createElement("a")
        a.href = url
        a.download = receivedFileInfo.name
        document.body.appendChild(a)
        console.log("Downloading file:", receivedFileInfo.name)
        a.click()
        document.body.removeChild(a)

        console.log("received file info:", receivedFileInfo)
        console.log("receieved file metadata: ", receivedFile)

        // Reset for next transfer
        setReceivedFileInfo(null)
        setTransferProgress(0)
      }
    }
  }

  return {
    socketRef,
    peerConnections,
    dataChannelRef,
    status,
    isConnected,
    connectionStatus,
    createWSConnection,
    sendWsMessage,
    createPeerConnection,
    createOffer,
    handleSignalingMessage,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handleRemoteUserLeft,
  }
}
