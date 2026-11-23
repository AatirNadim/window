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
  SharedFileOffer,
} from "@window/shared"

import { toast } from "sonner"
import { useFileStore } from "../fileStore"
import { usePullStore } from "../pullStore"
import { CHUNK_SIZE } from "@/lib/constants"
import {
  frameTransferChunk,
  TRANSFER_CHUNK_HEADER_BYTES,
  unframeTransferChunk,
} from "@/lib/transferProtocol"
import { v4 as uuidv4 } from "uuid"

export const useSocket = () => {
  const socketRef = useRef<WebSocket | null>(null)
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})
  const dataChannelMap = useRef<Record<string, RTCDataChannel | null>>({})
  const iceServersPromise = useRef<Promise<RTCIceServer[]> | null>(null)
  const activeSenderPulls = useRef<Set<string>>(new Set())
  const activeSenderTransfers = useRef<
    Record<
      string,
      {
        offerId: string
        requesterId: string
        file: File
        expectedChunks: number
      }
    >
  >({})
  const cancelledSenderPulls = useRef<Set<string>>(new Set())
  const incomingReceiveBudget = useRef({
    bytes: 0,
    byChannel: new Map<RTCDataChannel, number>(),
  })
  const pendingOfferFiles = useRef<Record<string, File>>({})
  const pendingPullRequests = useRef<Record<string, string>>({})
  const pullStartTimers = useRef<Record<string, number>>({})

  const [status, setStatus] = useState("Connecting to room...")
  const [isConnected, setIsConnected] = useState(false)
  const [isRoomFull, setIsRoomFull] = useState(false)

  const {
    userId,
    identityToken,
    userName,
    roomId,
    remoteUsers,
    addRemoteUser,
    removeRemoteUser,
    leaveRoom,
    setIdentityToken,
  } = useUserStore()

  const { resetFileStore } = useFileStore()

  const { setReceivedFile, setReceivedFileInfo, setTransferProgress } =
    useFileStore()
  const pullStore = usePullStore()

  const clearPullStartTimers = () => {
    for (const timer of Object.values(pullStartTimers.current))
      window.clearTimeout(timer)
    pullStartTimers.current = {}
  }

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
          identityToken: identityToken ?? undefined,
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
        pullStore.clearPullState()
        pendingOfferFiles.current = {}
        pendingPullRequests.current = {}
        clearPullStartTimers()
      }

      socket.onerror = () => {
        toast.error("Connection Error", {
          description: "Failed to connect to signaling server",
        })
        setStatus("Connection failed")
        leaveRoom()
        resetFileStore()
        pullStore.clearPullState()
        pendingOfferFiles.current = {}
        pendingPullRequests.current = {}
        clearPullStartTimers()
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
      case "identity-accepted":
        if (message.userId === userId) setIdentityToken(message.identityToken)
        break
      case "user-joined":
        console.log(
          "a new user has joined the room, creating a peer connection...",
        )
        await createPeerConnection(message.userId, message.userName)
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

      case "file-offer-snapshot":
        pullStore.setOffers(message.offers)
        break
      case "file-offer-added":
        if (
          message.offer.ownerId === userId &&
          pendingOfferFiles.current[message.offer.offerId]
        ) {
          pullStore.addLocalOffer(
            message.offer,
            pendingOfferFiles.current[message.offer.offerId],
          )
          delete pendingOfferFiles.current[message.offer.offerId]
        } else {
          pullStore.upsertOffer(message.offer)
        }
        break
      case "file-offer-removed":
        pullStore.removeOffer(message.offerId)
        delete pendingPullRequests.current[message.offerId]
        if (pullStartTimers.current[message.offerId])
          window.clearTimeout(pullStartTimers.current[message.offerId])
        delete pullStartTimers.current[message.offerId]
        break
      case "file-pull-request":
        await handlePullRequest(
          message.offerId,
          message.requestId,
          message.requesterId,
        )
        break
      case "file-pull-decision":
        if (!pendingPullRequests.current[message.offerId]) break
        pullStore.setStatus(
          message.offerId,
          message.accepted ? "downloading" : "idle",
        )
        if (pullStartTimers.current[message.offerId]) {
          window.clearTimeout(pullStartTimers.current[message.offerId])
          delete pullStartTimers.current[message.offerId]
        }
        if (message.accepted) {
          pullStartTimers.current[message.offerId] = window.setTimeout(() => {
            if (pendingPullRequests.current[message.offerId] === message.requestId) {
              sendWsMessage({
                type: "cancel-file-pull",
                offerId: message.offerId,
                requestId: message.requestId,
              })
              delete pendingPullRequests.current[message.offerId]
              delete pullStartTimers.current[message.offerId]
              pullStore.setStatus(message.offerId, "unavailable")
              toast.error("Sender did not start the download", {
                description: "Retry while the sender is online.",
              })
            }
          }, 30_000)
        }
        if (!message.accepted) {
          delete pendingPullRequests.current[message.offerId]
          toast.error(message.reason || "The sender declined the download")
        }
        break
      case "file-pull-rejected":
        pullStore.setStatus(message.offerId, "idle")
        delete pendingPullRequests.current[message.offerId]
        if (pullStartTimers.current[message.offerId])
          window.clearTimeout(pullStartTimers.current[message.offerId])
        delete pullStartTimers.current[message.offerId]
        toast.error(message.reason)
        break
      case "file-pull-cancelled": {
        const transferKey = `${message.requesterId}:${message.requestId}`
        cancelledSenderPulls.current.add(transferKey)
        activeSenderPulls.current.delete(message.requesterId)
        delete activeSenderTransfers.current[message.requestId]
        const channel = dataChannelMap.current[message.requesterId]
        if (channel?.readyState === "open")
          channel.send(
            JSON.stringify({
              protocol: "window-pull-v1",
              kind: "abort",
              offerId: message.offerId,
              requestId: message.requestId,
            }),
          )
        break
      }
      case "file-pull-finished": {
        const transfer = activeSenderTransfers.current[message.requestId]
        if (
          transfer &&
          transfer.offerId === message.offerId &&
          transfer.requesterId === message.requesterId &&
          transfer.file.size === message.bytes &&
          transfer.expectedChunks === message.chunks
        ) {
          toast.success(
            `${transfer.file.name} downloaded by ${remoteUsers[message.requesterId] ?? "a peer"}`,
          )
        } else {
          toast.error("Download confirmation did not match the transfer")
        }
        activeSenderPulls.current.delete(message.requesterId)
        delete activeSenderTransfers.current[message.requestId]
        break
      }

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
        toast.error("Error", {
          description: message.message || "An error occurred",
        })
        break

      case "room-full":
        setIsRoomFull(true)
        toast.error("Room is Full", {
          description: "This room has reached its maximum capacity of 6 users.",
          duration: 5000,
          closeButton: true,
        })
        break
    }
  }

  const handlePullRequest = async (
    offerId: string,
    requestId: string,
    requesterId: string,
  ) => {
    const offer = pullStore.offers.find((item) => item.offerId === offerId)
    const file = pullStore.files[offerId]
    const channel = dataChannelMap.current[requesterId]
    const allowed =
      offer &&
      offer.ownerId === userId &&
      offer.expiresAt > Date.now() &&
      (offer.visibility === "room" || offer.recipientIds.includes(requesterId))
    if (
      !allowed ||
      !file ||
      !channel ||
      channel.readyState !== "open" ||
      activeSenderPulls.current.has(requesterId)
    ) {
      sendWsMessage({
        type: "file-pull-decision",
        offerId,
        requestId,
        requesterId,
        accepted: false,
        reason: "The sender is unavailable. Try again later.",
      })
      return
    }
    activeSenderPulls.current.add(requesterId)
    const chunkPayloadSize = CHUNK_SIZE - TRANSFER_CHUNK_HEADER_BYTES
    const expectedChunks = Math.ceil(file.size / chunkPayloadSize)
    activeSenderTransfers.current[requestId] = {
      offerId,
      requesterId,
      file,
      expectedChunks,
    }
    sendWsMessage({
      type: "file-pull-decision",
      offerId,
      requestId,
      requesterId,
      accepted: true,
    })
    try {
      channel.send(
        JSON.stringify({
          protocol: "window-pull-v1",
          kind: "start",
          offerId,
          requestId,
          name: file.name,
          type: file.type,
          size: file.size,
          chunks: expectedChunks,
        }),
      )
      let offset = 0
      let chunkIndex = 0
      while (offset < file.size) {
        if (cancelledSenderPulls.current.has(`${requesterId}:${requestId}`))
          throw new Error("Transfer cancelled by recipient")
        if (!usePullStore.getState().files[offerId])
          throw new Error("Offer is no longer available")
        if (channel.readyState !== "open")
          throw new Error("Peer connection closed")
        if (channel.bufferedAmount > 10 * 1024 * 1024)
          await new Promise<void>((resolve, reject) => {
            channel.bufferedAmountLowThreshold = 1024 * 1024
            if (channel.bufferedAmount <= channel.bufferedAmountLowThreshold) {
              resolve()
              return
            }
            const cleanup = () => {
              window.clearTimeout(timer)
              channel.removeEventListener("bufferedamountlow", onLow)
              channel.removeEventListener("close", onClose)
            }
            const onLow = () => { cleanup(); resolve() }
            const onClose = () => { cleanup(); reject(new Error("Peer connection closed")) }
            const timer = window.setTimeout(() => {
              cleanup()
              reject(new Error("Transfer stalled"))
            }, 30_000)
            channel.addEventListener("bufferedamountlow", onLow, { once: true })
            channel.addEventListener("close", onClose, { once: true })
          })
        const chunk = await file
          .slice(offset, offset + chunkPayloadSize)
          .arrayBuffer()
        if (cancelledSenderPulls.current.has(`${requesterId}:${requestId}`))
          throw new Error("Transfer cancelled by recipient")
        const framedChunk = await frameTransferChunk(chunkIndex, chunk)
        channel.send(framedChunk)
        offset += chunk.byteLength
        chunkIndex += 1
      }
      channel.send(
        JSON.stringify({
          protocol: "window-pull-v1",
          kind: "end",
          offerId,
          requestId,
          chunks: chunkIndex,
          bytes: file.size,
        }),
      )
      window.setTimeout(
        () => {
          if (activeSenderTransfers.current[requestId]) {
            activeSenderPulls.current.delete(requesterId)
            delete activeSenderTransfers.current[requestId]
            cancelledSenderPulls.current.delete(`${requesterId}:${requestId}`)
          }
        },
        10 * 60 * 1000,
      )
    } catch {
      if (channel.readyState === "open")
        channel.send(
          JSON.stringify({
            protocol: "window-pull-v1",
            kind: "abort",
            offerId,
            requestId,
          }),
        )
      toast.error("Transfer interrupted", {
        description: `${file.name} could not be sent completely.`,
      })
      sendWsMessage({
        type: "file-pull-decision",
        offerId,
        requestId,
        requesterId,
        accepted: false,
        reason: "Transfer interrupted",
      })
      activeSenderPulls.current.delete(requesterId)
      delete activeSenderTransfers.current[requestId]
      cancelledSenderPulls.current.delete(`${requesterId}:${requestId}`)
    }
  }

  const requestFilePull = (offer: SharedFileOffer) => {
    if (!userId) return
    if (Object.keys(pendingPullRequests.current).length > 0) {
      toast.info("One download at a time", {
        description:
          "Finish or cancel the current pull before starting another.",
      })
      return
    }
    const requestId = uuidv4()
    pendingPullRequests.current[offer.offerId] = requestId
    pullStore.setStatus(offer.offerId, "requesting")
    pullStore.setProgress(offer.offerId, 0)
    sendWsMessage({
      type: "request-file-pull",
      offerId: offer.offerId,
      requestId,
    })
    window.setTimeout(() => {
      if (
        pendingPullRequests.current[offer.offerId] === requestId &&
        usePullStore.getState().statuses[offer.offerId] === "requesting"
      ) {
        sendWsMessage({
          type: "cancel-file-pull",
          offerId: offer.offerId,
          requestId,
        })
        delete pendingPullRequests.current[offer.offerId]
        usePullStore.getState().setStatus(offer.offerId, "idle")
        usePullStore.getState().setProgress(offer.offerId, 0)
        toast.error("No response", {
          description: "The sender did not respond. Try again.",
        })
      }
    }, 30_000)
  }

  const publishFileOffer = (offer: SharedFileOffer, file: File) => {
    pendingOfferFiles.current[offer.offerId] = file
    sendWsMessage({ type: "publish-file-offer", roomId: offer.roomId, offer })
    window.setTimeout(() => {
      if (pendingOfferFiles.current[offer.offerId]) {
        delete pendingOfferFiles.current[offer.offerId]
        toast.error("Offer could not be published", {
          description: "Check the room connection and try again.",
        })
      }
    }, 10_000)
  }

  const revokeFileOffer = (offerId: string) => {
    sendWsMessage({ type: "revoke-file-offer", offerId })
    pullStore.removeOffer(offerId)
  }

  const cancelFilePull = (offer: SharedFileOffer) => {
    const requestId = pendingPullRequests.current[offer.offerId]
    if (!requestId) return
    sendWsMessage({
      type: "cancel-file-pull",
      offerId: offer.offerId,
      requestId,
    })
    delete pendingPullRequests.current[offer.offerId]
    if (pullStartTimers.current[offer.offerId])
      window.clearTimeout(pullStartTimers.current[offer.offerId])
    delete pullStartTimers.current[offer.offerId]
    pullStore.setStatus(offer.offerId, "idle")
    pullStore.setProgress(offer.offerId, 0)
  }

  const reserveIncomingBytes = (channel: RTCDataChannel, size: number) => {
    const previous = incomingReceiveBudget.current.byChannel.get(channel) ?? 0
    const totalWithoutPrevious = incomingReceiveBudget.current.bytes - previous
    if (totalWithoutPrevious + size > 50 * 1024 * 1024) return false
    incomingReceiveBudget.current.bytes = totalWithoutPrevious + size
    incomingReceiveBudget.current.byChannel.set(channel, size)
    return true
  }

  const releaseIncomingBytes = (channel: RTCDataChannel) => {
    const reserved = incomingReceiveBudget.current.byChannel.get(channel) ?? 0
    incomingReceiveBudget.current.bytes = Math.max(
      0,
      incomingReceiveBudget.current.bytes - reserved,
    )
    incomingReceiveBudget.current.byChannel.delete(channel)
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

        if (!roomId || !userId) {
          throw new Error("Room ID or User ID is not set")
        }

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
      // whenever a data channel is recieved from remote peer, register it
      dataChannelMap.current[remoteUserId] = channel
      console.debug(
        `Data channel established with remote user ${remoteUserId}:`,
        channel,
      )

      registerDataChannelListeners(channel, remoteUserId)
    }
  }

  const getIceServers = () => {
    if (!iceServersPromise.current) {
      const protocol = window.location.protocol === "https:" ? "https" : "http"
      iceServersPromise.current = fetch(
        `${protocol}://${serverPath}/ice-servers`,
      )
        .then(async (response) => {
          if (!response.ok) throw new Error("ICE configuration request failed")
          const result = (await response.json()) as {
            iceServers?: RTCIceServer[]
          }
          if (!result.iceServers?.length)
            throw new Error("ICE configuration is empty")
          return result.iceServers
        })
        .catch((error) => {
          console.warn("Using STUN-only ICE configuration:", error)
          return [
            {
              urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
              ],
            },
          ]
        })
    }
    return iceServersPromise.current
  }

  const createPeerConnection = async (
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
        iceServers: await getIceServers(),
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

      // create data channel for file transfer, so that it is ready when offer is created
      // this data channel will be received by remote peer in ondatachannel event

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

      registerDataChannelListeners(dataChannel, remoteUserId)

      console.debug("Creating offer for remote user:", remoteUserId)

      const offer = await pc.createOffer()

      console.debug("Setting local description with offer:", offer)

      await pc.setLocalDescription(offer)

      sendWsMessage({
        type: "offer",
        fromUserId: userId,
        fromUserName: userName,
        toUserId: remoteUserId,
        // @ts-expect-error sdp is not null here
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
        await createPeerConnection(msg.fromUserId, msg.fromUserName)
        pc = peerConnections.current[fromUserId]
        console.log("Created new peer connection for user:", fromUserId)
      }

      console.log("Handling offer from remote user:", fromUserId)
      console.log("Received offer:", offer)

      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      console.log("Remote description set with offer:", offer)

      if (!roomId) {
        throw new Error("Room ID is not set")
      }

      // Create an answer to send back
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      console.log("Created answer:", answer)

      sendWsMessage({
        type: "answer",
        roomId,
        fromUserId: userId,
        toUserId: fromUserId,
        // @ts-expect-error sdp is not null here
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
      usePullStore
        .getState()
        .offers.filter((offer) => offer.ownerId === remoteUserId)
        .forEach((offer) => {
          usePullStore.getState().setStatus(offer.offerId, "unavailable")
          delete pendingPullRequests.current[offer.offerId]
          if (pullStartTimers.current[offer.offerId])
            window.clearTimeout(pullStartTimers.current[offer.offerId])
          delete pullStartTimers.current[offer.offerId]
        })
      // if there is only a single peer connection left and its connectivity is failed,
      // set isConnected to false
    } catch (error) {
      console.error("Error handling remote user left:", error)
      toast.error("Error handling Remote User Left", {
        description: `Failed to handle remote user ${remoteUserId} leaving the room.: ${error}`,
      })
    }
  }

  const registerDataChannelListeners = (
    channel: RTCDataChannel,
    remoteUserId: string,
  ) => {
    let receivedChunks: ArrayBuffer[] = []
    let receivedFileInfo: { name: string; type: string; size: number } | null =
      null
    let receivedSize = 0
    let expectedChunkIndex = 0
    let declaredChunkCount: number | null = null
    let transferProtocol: "window-pull-v1" | "window-push-v1" | null = null
    let pushTransferId: string | null = null
    let pullingOfferId: string | null = null
    let pullRequestId: string | null = null
    let pullInactivityTimer: number | null = null
    let immediateInactivityTimer: number | null = null

    const clearPullTimer = () => {
      if (pullInactivityTimer !== null) window.clearTimeout(pullInactivityTimer)
      pullInactivityTimer = null
    }
    const clearImmediateTimer = () => {
      if (immediateInactivityTimer !== null)
        window.clearTimeout(immediateInactivityTimer)
      immediateInactivityTimer = null
    }
    const armImmediateTimeout = () => {
      clearImmediateTimer()
      immediateInactivityTimer = window.setTimeout(() => {
        if (receivedFileInfo && !pullingOfferId) {
          releaseIncomingBytes(channel)
          receivedFileInfo = null
          receivedChunks = []
          receivedSize = 0
          expectedChunkIndex = 0
          declaredChunkCount = null
          transferProtocol = null
          pushTransferId = null
          channel.close()
          toast.error("Incoming transfer timed out", {
            description: "No file data arrived for two minutes.",
          })
        }
      }, 120_000)
    }
    const resetIncomingPull = (notifyServer: boolean) => {
      if (pullingOfferId && pullRequestId) {
        if (notifyServer)
          sendWsMessage({
            type: "cancel-file-pull",
            offerId: pullingOfferId,
            requestId: pullRequestId,
          })
        delete pendingPullRequests.current[pullingOfferId]
        pullStore.setStatus(pullingOfferId, "unavailable")
      }
      clearPullTimer()
      releaseIncomingBytes(channel)
      pullingOfferId = null
      pullRequestId = null
      receivedFileInfo = null
      receivedChunks = []
      receivedSize = 0
      expectedChunkIndex = 0
      declaredChunkCount = null
      transferProtocol = null
      pushTransferId = null
    }
    const downloadReceivedFile = (
      info: { name: string; type: string; size: number },
      chunks: ArrayBuffer[],
    ) => {
      const url = URL.createObjectURL(new Blob(chunks, { type: info.type }))
      setReceivedFile({ name: info.name, url })
      const link = document.createElement("a")
      link.href = url
      link.download = info.name
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(`${info.name} downloaded`)
    }
    const armPullTimeout = () => {
      clearPullTimer()
      pullInactivityTimer = window.setTimeout(() => {
        if (pullingOfferId && pullRequestId) {
          resetIncomingPull(true)
          toast.error("Download timed out", {
            description:
              "No file data arrived for two minutes. Retry the download.",
          })
        }
      }, 120_000)
    }

    channel.onopen = () => {
      console.log("Data channel is open:", channel.label)
    }

    channel.onclose = () => {
      console.log("Data channel is closed:", channel.label)
      if (pullingOfferId) resetIncomingPull(true)
      else {
        clearImmediateTimer()
        releaseIncomingBytes(channel)
      }
      for (const offer of usePullStore.getState().offers) {
        if (
          offer.ownerId === remoteUserId &&
          pendingPullRequests.current[offer.offerId]
        ) {
          pullStore.setStatus(offer.offerId, "unavailable")
          sendWsMessage({
            type: "cancel-file-pull",
            offerId: offer.offerId,
            requestId: pendingPullRequests.current[offer.offerId],
          })
          delete pendingPullRequests.current[offer.offerId]
        }
      }
    }

    channel.onmessage = async (event) => {
      let chunk = event.data

      // If data is a string, it's metadata.
      if (typeof chunk === "string") {
        try {
          const parsed = JSON.parse(chunk)
          if (parsed?.protocol === "window-pull-v1") {
            if (
              parsed.kind === "start" &&
              typeof parsed.offerId === "string" &&
              typeof parsed.requestId === "string" &&
              typeof parsed.name === "string" &&
              parsed.name.length > 0 &&
              parsed.name.length <= 255 &&
              typeof parsed.type === "string" &&
              parsed.type.length <= 160 &&
              Number.isSafeInteger(parsed.size) &&
              parsed.size >= 0 &&
              parsed.size <= 50 * 1024 * 1024 &&
              Number.isSafeInteger(parsed.chunks) &&
              parsed.chunks ===
                Math.ceil(
                  parsed.size / (CHUNK_SIZE - TRANSFER_CHUNK_HEADER_BYTES),
                )
            ) {
              const offeredMetadata = pullStore.offers.find(
                (offer) => offer.offerId === parsed.offerId,
              )
              if (
                !offeredMetadata ||
                offeredMetadata.ownerId !== remoteUserId ||
                pendingPullRequests.current[parsed.offerId] !==
                  parsed.requestId ||
                offeredMetadata.expiresAt <= Date.now() ||
                offeredMetadata.size !== parsed.size ||
                offeredMetadata.name !== parsed.name ||
                offeredMetadata.type !== parsed.type ||
                pullingOfferId !== null
              )
                return
              if (!reserveIncomingBytes(channel, parsed.size)) {
                sendWsMessage({
                  type: "cancel-file-pull",
                  offerId: parsed.offerId,
                  requestId: parsed.requestId,
                })
                delete pendingPullRequests.current[parsed.offerId]
                pullStore.setStatus(parsed.offerId, "unavailable")
                toast.error("Download paused", {
                  description:
                    "This browser has reached its 50 MB active receive limit.",
                })
                return
              }
              pullingOfferId = parsed.offerId
              if (pullStartTimers.current[parsed.offerId])
                window.clearTimeout(pullStartTimers.current[parsed.offerId])
              delete pullStartTimers.current[parsed.offerId]
              pullRequestId = parsed.requestId
              receivedFileInfo = {
                name: parsed.name,
                type: parsed.type,
                size: parsed.size,
              }
              receivedChunks = []
              receivedSize = 0
              expectedChunkIndex = 0
              declaredChunkCount = parsed.chunks
              transferProtocol = "window-pull-v1"
              pullStore.setStatus(parsed.offerId, "downloading")
              pullStore.setProgress(parsed.offerId, 0)
              armPullTimeout()
            } else if (
              parsed.kind === "abort" &&
              pullingOfferId === parsed.offerId &&
              pullRequestId === parsed.requestId
            ) {
              resetIncomingPull(true)
              toast.error("Transfer interrupted", {
                description: "The sender stopped this transfer.",
              })
            } else if (
              parsed.kind === "end" &&
              pullingOfferId &&
              pullRequestId &&
              pullingOfferId === parsed.offerId &&
              pullRequestId === parsed.requestId &&
              receivedFileInfo &&
              receivedSize === receivedFileInfo.size &&
              parsed.chunks === expectedChunkIndex &&
              parsed.chunks === declaredChunkCount &&
              parsed.bytes === receivedFileInfo.size
            ) {
              finishIncomingPull(
                pullingOfferId,
                receivedFileInfo,
                receivedChunks,
              )
              sendWsMessage({
                type: "finish-file-pull",
                offerId: pullingOfferId,
                requestId: pullRequestId,
                bytes: receivedSize,
                chunks: expectedChunkIndex,
              })
              delete pendingPullRequests.current[pullingOfferId]
              clearPullTimer()
              releaseIncomingBytes(channel)
              pullingOfferId = null
              pullRequestId = null
              receivedFileInfo = null
              receivedChunks = []
              receivedSize = 0
              expectedChunkIndex = 0
              declaredChunkCount = null
              transferProtocol = null
            }
            return
          }
          if (parsed?.protocol === "window-push-v1") {
            if (parsed.kind === "received") return
            if (
              parsed.kind === "abort" &&
              pushTransferId === parsed.transferId
            ) {
              releaseIncomingBytes(channel)
              receivedFileInfo = null
              receivedChunks = []
              receivedSize = 0
              pushTransferId = null
              transferProtocol = null
              declaredChunkCount = null
              toast.error("Transfer interrupted", {
                description: "The sender stopped sending this file.",
              })
              return
            }
            if (
              parsed.kind !== "start" ||
              typeof parsed.transferId !== "string" ||
              !Number.isSafeInteger(parsed.chunks) ||
              parsed.chunks !==
                Math.ceil(
                  parsed.size / (CHUNK_SIZE - TRANSFER_CHUNK_HEADER_BYTES),
                )
            )
              return
          }
          if (
            !parsed ||
            typeof parsed.name !== "string" ||
            parsed.name.length === 0 ||
            parsed.name.length > 255 ||
            typeof parsed.type !== "string" ||
            !Number.isSafeInteger(parsed.size) ||
            parsed.size < 0 ||
            parsed.size > 50 * 1024 * 1024 ||
            !reserveIncomingBytes(channel, parsed.size)
          ) {
            toast.error("Incoming file rejected", {
              description:
                "Invalid metadata or the browser's 50 MB active receive limit was reached.",
            })
            channel.close()
            return
          }
          const incomingFileInfo = {
            name: parsed.name,
            type: parsed.type,
            size: parsed.size,
          }
          receivedFileInfo = incomingFileInfo
          receivedChunks = []
          receivedSize = 0
          expectedChunkIndex = 0
          declaredChunkCount =
            parsed.protocol === "window-push-v1" ? parsed.chunks : null
          transferProtocol =
            parsed.protocol === "window-push-v1" ? "window-push-v1" : null
          pushTransferId =
            parsed.protocol === "window-push-v1" ? parsed.transferId : null
          armImmediateTimeout()

          setReceivedFileInfo(incomingFileInfo)
          setTransferProgress(0)
          toast.success("Incoming File", {
            description: `Receiving ${incomingFileInfo.name} (${(incomingFileInfo.size / 1024 / 1024).toFixed(2)} MB)`,
          })
          if (incomingFileInfo.size === 0) {
            downloadReceivedFile(incomingFileInfo, [])
            if (pushTransferId)
              channel.send(
                JSON.stringify({
                  protocol: "window-push-v1",
                  kind: "received",
                  transferId: pushTransferId,
                  bytes: 0,
                  chunks: 0,
                }),
              )
            releaseIncomingBytes(channel)
            clearImmediateTimer()
            receivedFileInfo = null
            pushTransferId = null
            transferProtocol = null
            declaredChunkCount = null
          }
        } catch (error) {
          console.error("Error parsing metadata:", error)
        }
        return
      }

      // Otherwise, it's a file chunk (ArrayBuffer)
      if (chunk instanceof Blob) {
        chunk = await chunk.arrayBuffer()
      } else if (chunk instanceof String) {
        chunk = new TextEncoder().encode(chunk as string).buffer
      }

      if (chunk instanceof ArrayBuffer === false) {
        console.error("Received incompatible segment type", chunk)
        return
      }

      if (transferProtocol) {
        try {
          if (
            declaredChunkCount !== null &&
            expectedChunkIndex >= declaredChunkCount
          )
            throw new Error("Unexpected extra file chunk")
          chunk = await unframeTransferChunk(chunk, expectedChunkIndex)
          if (chunk.byteLength === 0) throw new Error("Empty file chunk")
          expectedChunkIndex += 1
          if (pullingOfferId) armPullTimeout()
          else armImmediateTimeout()
        } catch (error) {
          if (pullingOfferId) {
            resetIncomingPull(true)
          } else {
            releaseIncomingBytes(channel)
            receivedFileInfo = null
            receivedChunks = []
            receivedSize = 0
            expectedChunkIndex = 0
            declaredChunkCount = null
            transferProtocol = null
            pushTransferId = null
            channel.close()
          }
          toast.error("Invalid file transfer", {
            description:
              error instanceof Error
                ? error.message
                : "Chunk verification failed.",
          })
          return
        }
      }

      // highly unlikely, but checking if metadata was received
      if (!receivedFileInfo) {
        console.error("Received file chunk before metadata")
        return
      }

      // push chunk to received chunks
      receivedChunks.push(chunk)
      receivedSize += chunk.byteLength

      if (receivedFileInfo && receivedSize > receivedFileInfo.size) {
        if (pullingOfferId) {
          resetIncomingPull(true)
        } else {
          clearImmediateTimer()
          releaseIncomingBytes(channel)
          receivedFileInfo = null
          receivedChunks = []
          receivedSize = 0
          if (transferProtocol === "window-push-v1") channel.close()
        }
        toast.error("Invalid file transfer", {
          description: "Received more data than the sender declared.",
        })
        return
      }

      if (pullingOfferId)
        pullStore.setProgress(
          pullingOfferId,
          receivedFileInfo.size
            ? (receivedSize / receivedFileInfo.size) * 100
            : 100,
        )

      setTransferProgress((receivedSize / receivedFileInfo.size) * 100)

      // If all chunks received, assemble the file
      if (receivedSize === receivedFileInfo.size && !pullingOfferId) {
        if (
          declaredChunkCount !== null &&
          expectedChunkIndex !== declaredChunkCount
        ) {
          releaseIncomingBytes(channel)
          clearImmediateTimer()
          channel.close()
          toast.error("Invalid file transfer", {
            description: "The sender ended the file before all chunks arrived.",
          })
          return
        }
        if (transferProtocol === "window-push-v1" && pushTransferId) {
          channel.send(
            JSON.stringify({
              protocol: "window-push-v1",
              kind: "received",
              transferId: pushTransferId,
              bytes: receivedSize,
              chunks: expectedChunkIndex,
            }),
          )
        }
        downloadReceivedFile(receivedFileInfo, receivedChunks)
        releaseIncomingBytes(channel)
        clearImmediateTimer()

        // Reset local state for next file on this channel (if any, though we expect channel close)
        receivedChunks = []
        receivedSize = 0
        expectedChunkIndex = 0
        declaredChunkCount = null
        transferProtocol = null
        pushTransferId = null
        receivedFileInfo = null
      }
    }
  }

  const finishIncomingPull = (
    offerId: string,
    info: { name: string; type: string; size: number },
    chunks: ArrayBuffer[],
  ) => {
    const blob = new Blob(chunks, { type: info.type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = info.name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    pullStore.setProgress(offerId, 100)
    pullStore.setStatus(offerId, "idle")
    window.setTimeout(() => pullStore.setProgress(offerId, 0), 3000)
    toast.success(`${info.name} downloaded`)
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
      resetFileStore() // Reset file state when leaving room
      pullStore.clearPullState()
      pendingOfferFiles.current = {}
      pendingPullRequests.current = {}
      clearPullStartTimers()
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
    isRoomFull,
    createWSConnection,
    sendWsMessage,
    createPeerConnection,
    createOffer,
    handleSignalingMessage,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    cleanUp,
    requestFilePull,
    publishFileOffer,
    revokeFileOffer,
    cancelFilePull,
  }
}
