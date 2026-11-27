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
import { isProtocolId, isValidRemoteOffer, isVisibleOffer, PULL_CONTROL_PROTOCOL } from "@/lib/pullProtocol"

export const useSocket = () => {
  const socketRef = useRef<WebSocket | null>(null)
  const intentionalShutdown = useRef(false)
  const signalingErrorShown = useRef(false)
  const failedPeerTimers = useRef<Record<string, number>>({})
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
        sending: boolean
      }
    >
  >({})
  const cancelledSenderPulls = useRef<Set<string>>(new Set())
  const incomingReceiveBudget = useRef({
    bytes: 0,
    byChannel: new Map<RTCDataChannel, number>(),
  })
  const offerTimers = useRef<Record<string, number>>({})
  // Retain only expiry metadata briefly to answer requests already in flight.
  const expiredOffers = useRef(new Map<string, { retainUntil: number; visibility: SharedFileOffer["visibility"]; recipientIds: string[] }>())
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

  const clearOfferTimers = () => {
    Object.values(offerTimers.current).forEach(window.clearTimeout)
    offerTimers.current = {}
    expiredOffers.current.clear()
  }

  const sendControl = (peerId: string, message: object) => {
    const channel = dataChannelMap.current[peerId]
    if (!channel || channel.readyState !== "open") return false
    try {
      channel.send(JSON.stringify({ protocol: PULL_CONTROL_PROTOCOL, ...message }))
      return true
    } catch {
      return false
    }
  }

  const sendSnapshot = (peerId: string) => {
    const state = usePullStore.getState()
    const offers = state.offers.filter((offer) =>
      offer.ownerId === userId && state.files[offer.offerId] && isVisibleOffer(offer, peerId),
    )
    sendControl(peerId, { type: "file-offer-snapshot", offers })
  }

  const removeLocalOffer = (offerId: string, reason: "expired" | "revoked") => {
    const state = usePullStore.getState()
    const offer = state.offers.find((item) => item.offerId === offerId && item.ownerId === userId)
    if (!offer) return
    if (reason === "expired") {
      const now = Date.now()
      for (const [id, expired] of expiredOffers.current) {
        if (expired.retainUntil <= now) expiredOffers.current.delete(id)
      }
      expiredOffers.current.set(offerId, { retainUntil: now + 120_000, visibility: offer.visibility, recipientIds: offer.recipientIds })
      if (expiredOffers.current.size > 100) expiredOffers.current.delete(expiredOffers.current.keys().next().value!)
    }
    Object.keys(dataChannelMap.current).forEach((peerId) => {
      if (offer.visibility === "room" || offer.recipientIds.includes(peerId))
        sendControl(peerId, { type: "file-offer-removed", offerId, reason })
    })
    window.clearTimeout(offerTimers.current[offerId])
    delete offerTimers.current[offerId]
    state.removeOffer(offerId)
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
        if (intentionalShutdown.current) return
        setStatus("Disconnected from server")
        setIsConnected(false)
        if (!signalingErrorShown.current) {
          toast.error("Disconnected from the room", {
            description: "The signaling connection closed. Return home and rejoin the room.",
          })
          signalingErrorShown.current = true
        }
        leaveRoom()
        resetFileStore()
        pullStore.clearPullState()
        clearOfferTimers()
        pendingPullRequests.current = {}
        clearPullStartTimers()
      }

      socket.onerror = () => {
        if (intentionalShutdown.current || signalingErrorShown.current) return
        signalingErrorShown.current = true
        toast.error("Room connection failed", {
          description: "Could not connect to the signaling server. Check your connection and try again.",
        })
        setStatus("Connection failed")
        leaveRoom()
        resetFileStore()
        pullStore.clearPullState()
        clearOfferTimers()
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

      intentionalShutdown.current = false
      signalingErrorShown.current = false
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
        if (message.userId === userId) {
          setIdentityToken(message.identityToken)
          toast.success("Joined room", { description: "Share the invite link to connect with peers." })
        }
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

      case "user-left": {
        console.debug(
          `Remote user ${message.userId} has left the room. Peer connection closed.`,
        )

        const leavingUserName = useUserStore.getState().remoteUsers[message.userId] || "A peer"
        window.clearTimeout(failedPeerTimers.current[message.userId])
        delete failedPeerTimers.current[message.userId]
        handleRemoteUserLeft(message.userId)
        toast.info("Peer left room", {
          description: `${leavingUserName} has left the room.`,
        })
        break
      }

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

  const handlePeerControl = (message: {
    type: string
    offers: unknown
    offer: SharedFileOffer
    offerId: string
    requestId: string
    accepted: boolean
    reason: unknown
    bytes: number
    chunks: number
  }, peerId: string) => {
    if (!roomId || !userId || typeof message.type !== "string") return
    const state = usePullStore.getState()
    const remoteOffer = (offerId: string) => state.offers.find(
      (offer) => offer.offerId === offerId && offer.ownerId === peerId,
    )
    switch (message.type) {
      case "file-offer-snapshot": {
        if (!Array.isArray(message.offers) || message.offers.length > 20) return
        // An offer can expire in transit without invalidating the rest of the snapshot.
        const offers = message.offers.filter((offer: SharedFileOffer) =>
          !offer || !Number.isFinite(offer.expiresAt) || offer.expiresAt > Date.now(),
        )
        if (!offers.every((offer: unknown) => isValidRemoteOffer(offer, peerId, roomId, userId))) return
        const ids = new Set(offers.map((offer: SharedFileOffer) => offer.offerId))
        if (ids.size !== offers.length) return
        state.offers.filter((offer) => offer.ownerId === peerId && !ids.has(offer.offerId))
          .forEach((offer) => state.removeOffer(offer.offerId))
        offers.forEach((offer: SharedFileOffer) => {
          if (!state.offers.some((existing) => existing.offerId === offer.offerId && existing.ownerId !== peerId))
            usePullStore.getState().upsertOffer(offer)
        })
        break
      }
      case "file-offer-added":
        if (isValidRemoteOffer(message.offer, peerId, roomId, userId) &&
          !state.offers.some((offer) => offer.offerId === message.offer.offerId && offer.ownerId !== peerId) &&
          state.offers.filter((offer) => offer.ownerId === peerId).length < 20)
          state.upsertOffer(message.offer)
        break
      case "file-offer-removed":
        if (!remoteOffer(message.offerId)) return
        if (pendingPullRequests.current[message.offerId] && message.reason === "expired")
          toast.error("This file offer has expired. Ask the sender to offer the file again.")
        state.removeOffer(message.offerId)
        delete pendingPullRequests.current[message.offerId]
        window.clearTimeout(pullStartTimers.current[message.offerId])
        delete pullStartTimers.current[message.offerId]
        break
      case "file-pull-request":
        if (isProtocolId(message.offerId) && isProtocolId(message.requestId))
          void handlePullRequest(message.offerId, message.requestId, peerId)
        break
      case "file-pull-decision":
        if (!remoteOffer(message.offerId) || pendingPullRequests.current[message.offerId] !== message.requestId || typeof message.accepted !== "boolean") return
        state.setStatus(message.offerId, message.accepted ? "downloading" : "idle")
        window.clearTimeout(pullStartTimers.current[message.offerId])
        delete pullStartTimers.current[message.offerId]
        if (message.accepted) {
          pullStartTimers.current[message.offerId] = window.setTimeout(() => {
            if (pendingPullRequests.current[message.offerId] !== message.requestId) return
            sendControl(peerId, { type: "cancel-file-pull", offerId: message.offerId, requestId: message.requestId })
            delete pendingPullRequests.current[message.offerId]
            delete pullStartTimers.current[message.offerId]
            usePullStore.getState().setStatus(message.offerId, "unavailable")
            toast.error("Sender did not start the download")
          }, 30_000)
        } else {
          delete pendingPullRequests.current[message.offerId]
          toast.error(typeof message.reason === "string" ? message.reason : "The sender declined the download")
        }
        break
      case "cancel-file-pull": {
        const transfer = activeSenderTransfers.current[message.requestId]
        if (!transfer || transfer.requesterId !== peerId || transfer.offerId !== message.offerId) return
        cancelledSenderPulls.current.add(`${peerId}:${message.requestId}`)
        if (!transfer.sending) {
          activeSenderPulls.current.delete(peerId)
          delete activeSenderTransfers.current[message.requestId]
          cancelledSenderPulls.current.delete(`${peerId}:${message.requestId}`)
        }
        break
      }
      case "finish-file-pull": {
        const transfer = activeSenderTransfers.current[message.requestId]
        if (!transfer || transfer.sending || transfer.requesterId !== peerId || transfer.offerId !== message.offerId) return
        if (transfer.file.size === message.bytes && transfer.expectedChunks === message.chunks)
          toast.success(`${transfer.file.name} received by ${useUserStore.getState().remoteUsers[peerId] ?? "a peer"}`)
        else toast.error("Download confirmation did not match the transfer")
        activeSenderPulls.current.delete(peerId)
        delete activeSenderTransfers.current[message.requestId]
        break
      }
    }
  }

  const handlePullRequest = async (
    offerId: string,
    requestId: string,
    requesterId: string,
  ) => {
    const offer = usePullStore.getState().offers.find((item) => item.offerId === offerId)
    const file = usePullStore.getState().files[offerId]
    const channel = dataChannelMap.current[requesterId]
    const expired = expiredOffers.current.get(offerId)
    if (expired && expired.retainUntil <= Date.now()) expiredOffers.current.delete(offerId)
    const expiredOffer = offer?.ownerId === userId && offer.expiresAt <= Date.now() ? offer :
      expired && expired.retainUntil > Date.now() ? expired : undefined
    const wasEligible = expiredOffer && (expiredOffer.visibility === "room" || expiredOffer.recipientIds.includes(requesterId))
    if (wasEligible) {
      sendControl(requesterId, {
        type: "file-pull-decision", offerId, requestId, accepted: false,
        reason: "This file offer has expired. Ask the sender to offer the file again.",
      })
      return
    }
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
      activeSenderPulls.current.has(requesterId) ||
      activeSenderPulls.current.size >= 3 ||
      !!activeSenderTransfers.current[requestId]
    ) {
      sendControl(requesterId, {
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
      sending: true,
    }
    sendControl(requesterId, {
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
        if (cancelledSenderPulls.current.has(`${requesterId}:${requestId}`) || !usePullStore.getState().files[offerId] || offer.expiresAt <= Date.now())
          throw new Error("Offer is no longer available")
        channel.send(framedChunk)
        offset += chunk.byteLength
        chunkIndex += 1
      }
      if (cancelledSenderPulls.current.has(`${requesterId}:${requestId}`) || !usePullStore.getState().files[offerId] || offer.expiresAt <= Date.now())
        throw new Error("Offer is no longer available")
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
      if (activeSenderTransfers.current[requestId]) activeSenderTransfers.current[requestId].sending = false
      window.setTimeout(
        () => {
          if (activeSenderTransfers.current[requestId]?.requesterId === requesterId) {
            activeSenderPulls.current.delete(requesterId)
            delete activeSenderTransfers.current[requestId]
            cancelledSenderPulls.current.delete(`${requesterId}:${requestId}`)
          }
        },
        10 * 60 * 1000,
      )
    } catch {
      const cancelled = cancelledSenderPulls.current.has(`${requesterId}:${requestId}`)
      if (channel.readyState === "open")
        channel.send(
          JSON.stringify({
            protocol: "window-pull-v1",
            kind: "abort",
            offerId,
            requestId,
          }),
        )
      if (!cancelled && !intentionalShutdown.current)
        toast.error("Transfer interrupted", {
          description: `${file.name} could not be sent completely.`,
        })
      sendControl(requesterId, {
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
    if (!userId || !usePullStore.getState().offers.some((item) => item.offerId === offer.offerId && item.ownerId === offer.ownerId)) return
    if (Object.keys(pendingPullRequests.current).length > 0) {
      toast.warning("One download at a time", {
        description:
          "Finish or cancel the current pull before starting another.",
      })
      return
    }
    const requestId = uuidv4()
    pendingPullRequests.current[offer.offerId] = requestId
    pullStore.setStatus(offer.offerId, "requesting")
    pullStore.setProgress(offer.offerId, 0)
    if (!sendControl(offer.ownerId, {
      type: "file-pull-request",
      offerId: offer.offerId,
      requestId,
    })) {
      delete pendingPullRequests.current[offer.offerId]
      pullStore.setStatus(offer.offerId, "unavailable")
      toast.error("Peer connection is unavailable")
      return
    }
    window.setTimeout(() => {
      if (
        pendingPullRequests.current[offer.offerId] === requestId &&
        usePullStore.getState().statuses[offer.offerId] === "requesting"
      ) {
        sendControl(offer.ownerId, {
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
    const state = usePullStore.getState()
    const ownOffers = state.offers.filter((item) => item.ownerId === userId && item.expiresAt > Date.now())
    if (!userId || !isProtocolId(offer.offerId) || state.offers.some((item) => item.offerId === offer.offerId) || file.size > 50 * 1024 * 1024 || offer.ownerId !== userId || offer.roomId !== roomId || offer.expiresAt <= Date.now() ||
      ownOffers.length >= 20 || ownOffers.reduce((sum, item) => sum + item.size, file.size) > 200 * 1024 * 1024) {
      toast.error("Offer could not be published", { id: "offer-publish-error", description: "Check the file size and active offer limits, then try again." })
      return false
    }
    state.addLocalOffer(offer, file)
    Object.keys(dataChannelMap.current).forEach((peerId) => {
      if (isVisibleOffer(offer, peerId)) sendControl(peerId, { type: "file-offer-added", offer })
    })
    offerTimers.current[offer.offerId] = window.setTimeout(() => {
      removeLocalOffer(offer.offerId, "expired")
      toast.warning("File offer expired", { description: `${file.name} is no longer available to peers.` })
    }, Math.max(0, offer.expiresAt - Date.now()))
    return true
  }

  const revokeFileOffer = (offerId: string) => {
    const offer = usePullStore.getState().offers.find((item) => item.offerId === offerId && item.ownerId === userId)
    if (!offer) return
    removeLocalOffer(offerId, "revoked")
  }

  const cancelFilePull = (offer: SharedFileOffer) => {
    const requestId = pendingPullRequests.current[offer.offerId]
    if (!requestId) return
    sendControl(offer.ownerId, {
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
          window.clearTimeout(failedPeerTimers.current[remoteUserId])
          delete failedPeerTimers.current[remoteUserId]
          if (useUserStore.getState().remoteUsers[remoteUserId]) return
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
          toast.success("Peer connected", {
            description: `${remoteUserName} connected to the room.`,
          })
          break
        case "disconnected":
          console.warn(
            `Connection with remote user ${remoteUserId} disconnected. Reconnecting...`,
          )

          break
        case "failed":
          // A normal departure may close WebRTC before the signaling message arrives.
          if (!failedPeerTimers.current[remoteUserId] && !intentionalShutdown.current) {
            failedPeerTimers.current[remoteUserId] = window.setTimeout(() => {
              delete failedPeerTimers.current[remoteUserId]
              if (intentionalShutdown.current || peerConnections.current[remoteUserId] !== pc || pc.connectionState !== "failed") return
              toast.error("Peer connection failed", {
                description: `Could not maintain a connection with ${remoteUserName}.`,
              })
              handleRemoteUserLeft(remoteUserId)
            }, 2000)
          }
          break
        case "closed":
          // Closing a connection is expected during peer departure and room cleanup.
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
      if (channel.label === "fileTransfer") dataChannelMap.current[remoteUserId] = channel
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

      const connectedPeers = Object.values(peerConnections.current).some((pc) => pc.connectionState === "connected")
      setIsConnected(connectedPeers)
      if (!connectedPeers) setStatus("Waiting for other users...")

      removeRemoteUser(remoteUserId)
      usePullStore
        .getState()
        .offers.filter((offer) => offer.ownerId === remoteUserId)
        .forEach((offer) => {
          usePullStore.getState().removeOffer(offer.offerId)
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
    const resetIncomingPull = (notifyPeer: boolean) => {
      if (pullingOfferId && pullRequestId) {
        if (notifyPeer)
          sendControl(remoteUserId, {
            type: "cancel-file-pull",
            offerId: pullingOfferId,
            requestId: pullRequestId,
          })
        if (pendingPullRequests.current[pullingOfferId] === pullRequestId) {
          delete pendingPullRequests.current[pullingOfferId]
          pullStore.setStatus(pullingOfferId, "unavailable")
        }
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
      toast.success("File received", { description: `Your browser is downloading ${info.name}.` })
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
      if (channel.label === "fileTransfer") sendSnapshot(remoteUserId)
    }

    channel.onclose = () => {
      console.log("Data channel is closed:", channel.label)
      if (pullingOfferId) resetIncomingPull(true)
      else {
        clearImmediateTimer()
        releaseIncomingBytes(channel)
      }
      if (channel.label !== "fileTransfer") return
      if (dataChannelMap.current[remoteUserId] && channel !== dataChannelMap.current[remoteUserId]) return
      delete dataChannelMap.current[remoteUserId]
      for (const [requestId, transfer] of Object.entries(activeSenderTransfers.current)) {
        if (transfer.requesterId === remoteUserId) {
          cancelledSenderPulls.current.add(`${remoteUserId}:${requestId}`)
          if (!transfer.sending) {
            delete activeSenderTransfers.current[requestId]
            cancelledSenderPulls.current.delete(`${remoteUserId}:${requestId}`)
          }
        }
      }
      activeSenderPulls.current.delete(remoteUserId)
      for (const offer of usePullStore.getState().offers) {
        if (offer.ownerId === remoteUserId) {
          pullStore.removeOffer(offer.offerId)
          window.clearTimeout(pullStartTimers.current[offer.offerId])
          delete pullStartTimers.current[offer.offerId]
          delete pendingPullRequests.current[offer.offerId]
        }
      }
    }

    // File chunk verification is asynchronous; preserve channel order through completion.
    let incomingMessages = Promise.resolve()
    channel.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data)
          if (message?.protocol === PULL_CONTROL_PROTOCOL) {
            if (channel === dataChannelMap.current[remoteUserId]) handlePeerControl(message, remoteUserId)
            return
          }
        } catch { /* The file message handler reports invalid metadata. */ }
      }
      incomingMessages = incomingMessages.then(() => channel.readyState === "open" ? handleDataMessage(event) : undefined).catch((error) => {
        console.error("Error processing data channel message:", error)
        channel.close()
      })
    }

    const handleDataMessage = async (event: MessageEvent) => {
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
              const offeredMetadata = usePullStore.getState().offers.find(
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
                sendControl(remoteUserId, {
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
              pullingOfferId && pullRequestId &&
              pullingOfferId === parsed.offerId &&
              pullRequestId === parsed.requestId
            ) {
              const wasCancelled = pendingPullRequests.current[pullingOfferId] !== pullRequestId
              resetIncomingPull(!wasCancelled)
              if (!wasCancelled) toast.error("Transfer interrupted", {
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
              sendControl(remoteUserId, {
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
          toast.info("Receiving file", {
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
    toast.success("File received", { description: `Your browser is downloading ${info.name}.` })
  }

  const cleanUp = () => {
    intentionalShutdown.current = true
    Object.values(failedPeerTimers.current).forEach(window.clearTimeout)
    failedPeerTimers.current = {}
    try {
      Object.values(peerConnections.current).forEach((pc) => pc.close())

      console.log("leaving room:", roomId)

      if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(
        JSON.stringify({
          type: "leave-room",
          roomId,
          userId,
        } as LeaveRoomMessage),
      )
      socketRef.current?.close()
      resetFileStore() // Reset file state when leaving room
      pullStore.clearPullState()
      clearOfferTimers()
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
