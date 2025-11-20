import { useRef, useState } from "react"
import { useUserStore } from "../userStore"
import { serverPath } from "@/lib/constants"
import type {
  AnswerMessage,
  IceCandidateMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  OfferMessage,
  WebSocketMessage,
} from "@/types"

import { toast } from "sonner"
import { useFileStore } from "../fileStore"

export const useSocket = () => {
  const socketRef = useRef<WebSocket | null>(null)
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})
  const dataChannelMap = useRef<Record<string, RTCDataChannel | null>>({})

  const [status, setStatus] = useState("Connecting to room...")
  const [isConnected, setIsConnected] = useState(false)

  const {
    userId,
    userName,
    roomId,
    setRoomId,
    remoteUsers,
    addRemoteUser,
    removeRemoteUser,
    clearRemoteUsers,
    leaveRoom,
  } = useUserStore()

  const { resetFileStore } = useFileStore()

  const {
    setTransferProgress,
    setReceivedFileInfo,
    addReceivedChunk,
    clearReceivedChunks,
    setReceivedFile,
  } = useFileStore()

  const registerListenersForSocket = (socket: WebSocket) => {
    try {
      socket.onopen = () => {
        setStatus("Joining room...")

        if (!roomId || !userId || !userName) {
          console.error("Room ID, User ID or User Name is not set")
          return
        }

        const msg: JoinRoomMessage = {
          type: "join-room",
          roomId,
          userId,
          userName,
        }

        console.log("Joining room with message: ", msg)
        // Join the room automatically with user info
        socket.send(JSON.stringify(msg))

        console.debug("WebSocket connection established")
        setStatus("Waiting for other users...")
      }

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        handleSignalingMessage(message)
      }

      socket.onclose = () => {
        setStatus("Disconnected from server")
        setIsConnected(false)
        toast.error("Disconnected", {
          description:
            "Disconnected from signaling server. Returning to home page.",
        })
        leaveRoom()
        resetFileStore()
      }

      socket.onerror = () => {
        toast.error("Connection Error", {
          description: "Failed to connect to signaling server",
        })
        setStatus("Connection failed")
        leaveRoom()
        resetFileStore()
      }
    } catch (error) {
      console.error("Error registering WebSocket listeners:", error)
    }
  }

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
      console.log("user details:", userId, userName)

      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws"
      const socket = new WebSocket(`${wsProtocol}://${serverPath}`)
      socketRef.current = socket

      registerListenersForSocket(socket)
    } catch (error) {
      console.error("Error creating WebSocket connection:", error)
      toast.error("Connection Error", {
        description: "Failed to connect to signaling server",
      })
      setStatus("Connection failed")
      throw error
    }
  }

  const handleSignalingMessage = async (message: WebSocketMessage) => {
    console.debug("Received signaling message: ", message)
    switch (message.type) {
      case "user-joined":
        console.log(
          "a new user has joined the room, creating a peer connection...",
        )
        createPeerConnection(message.userId, message.userName)
        await createOffer(message.userId)
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
        console.debug(
          `Remote user ${message.userId} has left the room. Peer connection closed.`,
        )

        toast.info("Remote User Left", {
          description: `User with ID ${message.userId} has left the room.`,
        })

        handleRemoteUserLeft(message.userId)
        toast.error("User Left", {
          description: "The other user has left the room.",
        })
        break

      case "error":
        setStatus("Connection failed")
        setIsConnected(false)
        toast.error("Error", {
          description: message.message || "An error occurred",
        })
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

  const registerPCEventHandlers = (
    pc: RTCPeerConnection,
    remoteUserId: string,
    remoteUserName: string,
  ) => {
    console.log("running pc event handler registration...")
    pc.onicecandidate = (event) => {
      console.log(
        "\n\nreceived event of ice candidate:",
        event.candidate,
        "\n\n",
      )
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
      console.log(
        "\n\ncurrent pc connection state:",
        pc.connectionState,
        "\n\n",
      )
      switch (pc.connectionState) {
        case "connected":
          if (remoteUsers[remoteUserId]) return
          console.debug(
            `Connection established with remote user ${remoteUserId}`,
          )
          console.log(
            "adding remote user to store...",
            remoteUserId,
            remoteUserName,
          )
          addRemoteUser(remoteUserId, remoteUserName)
          setIsConnected(true)
          setStatus("Connected to peer(s)...")
          toast.success("New User Joined", {
            description: `A new user, ${remoteUserName}, with ID ${remoteUserId} joined the room.`,
          })
          break
        case "disconnected":
          console.warn(
            `Connection with remote user ${remoteUserId} disconnected. Reconnecting...`,
          )

          break
        case "failed":
          console.warn(
            `Connection with remote user ${remoteUserId} lost. Attempting to reconnect...`,
          )

          toast.error("Connection lost with User", {
            description: `Connection with user ${remoteUserName} lost.`,
          })
          handleRemoteUserLeft(remoteUserId)
          break
        case "closed":
          console.warn(`Connection with remote user ${remoteUserId} closed.`)
          toast.info("Connection Closed", {
            description: `Connection with user ${remoteUserName} has been closed.`,
          })
          handleRemoteUserLeft(remoteUserId)

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

      switch (pc.iceConnectionState) {
        case "disconnected":
          toast.warning("ICE Disconnected", {
            description: `ICE connection with user ${remoteUserName} disconnected.`,
          })
          break
        case "failed":
          console.error("ICE connection failed, attempting restart")
          pc.restartIce()
          break
      }
    }

    pc.onicegatheringstatechange = () => {
      console.log(
        `ICE gathering state with ${remoteUserId}: ${pc.iceGatheringState}`,
      )
    }

    pc.ondatachannel = (event) => {
      const channel = event.channel
      dataChannelMap.current[remoteUserId] = channel
      console.debug(
        `Data channel established with remote user ${remoteUserId}:`,
        channel,
      )

      registerDataChannelListeners(channel)
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
      console.log("running pc event handler registration...")

      registerPCEventHandlers(pc, remoteUserId, remoteUserName)

      peerConnections.current[remoteUserId] = pc

      console.info(
        "new peer connection created and added to records for user:",
        remoteUserId,
      )

      // create data channel for file transfer, so that it is ready when offer is created

      console.debug(
        "Creating data channel for file transfer with remote user after answer:",
        remoteUserId,
      )

      const dataChannel = pc.createDataChannel("fileTransfer", {
        ordered: true,
      })

      dataChannelMap.current[remoteUserId] = dataChannel

      console.debug(
        "Data channel created after answer:",
        dataChannelMap.current[remoteUserId],
      )

      registerDataChannelListeners(dataChannel)
    } catch (error) {
      console.error("Error creating peer connection:", error)
      toast.error("Peer Connection Failed", {
        description: "Failed to create WebRTC peer connection.",
      })
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

      console.debug("Creating offer for remote user:", remoteUserId)

      const offer = await pc.createOffer()

      console.debug("Setting local description with offer:", offer)

      await pc.setLocalDescription(offer)

      sendWsMessage({
        type: "offer",
        fromUserId: userId,
        fromUserName: userName,
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
        console.log(
          "recieved an offer from a new remote user, creating peer connection...",
        )
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
    } catch (error) {
      console.error("Error handling answer:", error)
      toast.error("Answer Handling Failed", {
        description: "Failed to handle WebRTC answer.",
      })
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
      toast.error("ICE Candidate Handling Failed", {
        description: "Failed to handle WebRTC ICE candidate.",
      })
    }
  }

  const handleRemoteUserLeft = (remoteUserId: string) => {
    console.log(
      "recieved an event that remote user left the room:",
      remoteUserId,
    )
    try {
      peerConnections.current[remoteUserId]?.close()
      delete peerConnections.current[remoteUserId]
      delete dataChannelMap.current[remoteUserId]

      if (Object.keys(peerConnections.current).length === 0) {
        setStatus("Waiting for other users...")
      } else if (Object.keys(peerConnections.current).length === 1) {
        setIsConnected(false)
      }

      removeRemoteUser(remoteUserId)
      // if there is only a single peer connection left and its connectivity is failed,
      // set isConnected to false
    } catch (error) {
      console.error("Error handling remote user left:", error)
      toast.error("Error handling Remote User Left", {
        description: `Failed to handle remote user ${remoteUserId} leaving the room.: ${error}`,
      })
    }
  }

  const registerDataChannelListeners = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      console.log("Data channel is open:", channel)
    }

    channel.onclose = () => {
      console.log("Data channel is closed:", channel)
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

    // getting the latest state snapshot
    const { receivedChunks, receivedFileInfo, receivedFile } =
      useFileStore.getState()

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
        console.log("received file metadata: ", receivedFile)
      }
    }
  }

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

  return {
    socketRef,
    peerConnections,
    dataChannelMap,
    status,
    isConnected,
    createWSConnection,
    sendWsMessage,
    createPeerConnection,
    createOffer,
    handleSignalingMessage,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    cleanUp,
  }
}
