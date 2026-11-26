import { useFileStore } from "../fileStore"
import { toast } from "sonner"
import { CHUNK_SIZE, MAX_CHANNELS_FOR_DATA_TRANSMISSION } from "@/lib/constants"
import { useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import {
  frameTransferChunk,
  TRANSFER_CHUNK_HEADER_BYTES,
} from "@/lib/transferProtocol"

export const useFile = ({
  peerConnections,
}: {
  peerConnections: React.RefObject<Record<string, RTCPeerConnection | null>>
  dataChannelMap: React.RefObject<Record<string, RTCDataChannel | null>>
}) => {
  const {
    setTransferProgress,
    filesToBeSent,
    setIsSending,
    clearFilesToBeSent,
    setSendingFile,
  } = useFileStore()

  // Ref to track total bytes transferred across all concurrent uploads
  const globalTransferredRef = useRef(0)

  /**
   * Initiates the file sending process to all connected peers.
   * @returns Promise that resolves when all files have been sent
   */
  const sendFile = async () => {
    console.log("Sending files:", filesToBeSent)

    if (filesToBeSent.length === 0) {
      toast.error("No files selected to send")
      return
    }

    const peers = Object.entries(peerConnections.current).filter(
      ([, pc]) => pc?.connectionState === "connected",
    )
    if (peers.length === 0) {
      toast.error("No peers connected")
      return
    }

    setIsSending(true)
    setTransferProgress(0)
    globalTransferredRef.current = 0

    // Calculate total size of all files * number of peers (since we send to all)
    const totalSizePerPeer = filesToBeSent.reduce(
      (acc, file) => acc + file.size,
      0,
    )
    const totalGlobalSize = totalSizePerPeer * peers.length

    try {
      // send the files to all peers concurrently
      const peerPromises = peers.map(([remoteUserId, pc]) => {
        if (!pc) return Promise.resolve()
        return sendFilesToPeer(remoteUserId, pc, filesToBeSent, totalGlobalSize)
      })

      const results = await Promise.allSettled(peerPromises)

      const rejected = results.filter((res) => res.status === "rejected")
      if (rejected.length > 0) {
        console.error("Some peers failed to receive files:", rejected)
        throw new Error("Failed to send files to some peers")
      }

      toast.success("All files sent successfully")
    } catch (error) {
      console.error("Error sending files:", error)
      toast.error("Failed to send some files")
    } finally {
      setSendingFile(null)
      setIsSending(false)
      clearFilesToBeSent()
      globalTransferredRef.current = 0
    }
  }

  const sendFilesToPeer = async (
    remoteUserId: string,
    pc: RTCPeerConnection,
    files: File[],
    totalGlobalSize: number,
  ) => {
    // 1. Determine number of channels and distribute files
    const numChannels = Math.min(
      files.length,
      MAX_CHANNELS_FOR_DATA_TRANSMISSION,
    )
    const queues: File[][] = Array.from({ length: numChannels }, () => [])

    // Round-robin distribution
    files.forEach((file, index) => {
      queues[index % numChannels].push(file)
    })

    // 2. Create channels and start processing queues
    const channelPromises = queues.map((queue, index) => {
      if (queue.length === 0) return Promise.resolve()

      const channelLabel = `transfer-queue-${index}-${Date.now()}`
      const channel = pc.createDataChannel(channelLabel, { ordered: true })

      return processQueue(channel, queue, remoteUserId, totalGlobalSize)
    })

    const result = await Promise.allSettled(channelPromises)

    const rejected = result.filter((res) => res.status === "rejected")
    if (rejected.length > 0) {
      console.error(`Some channels failed for peer ${remoteUserId}:`, rejected)
      throw new Error(
        `Failed to send files to peer ${remoteUserId}: ${rejected}`,
      )
    }
  }

  /**
   * Sends all files in the given queue over the specified data channel. Multiple potential executions of this function happen concurrently for different channels.
   * @param channel one of the channels for sending files to a peer
   * @param queue the queue of the files to be sent to the given peer
   * @param remoteUserId the userid to identify the peer
   * @param totalGlobalSize total amount of data to be sent (all the files to all peers)
   * @returns Promise that resolves when all files in the queue have been sent
   */
  const processQueue = (
    channel: RTCDataChannel,
    queue: File[],
    remoteUserId: string,
    totalGlobalSize: number,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startQueueProcessing = async () => {
        console.log(`Channel ${channel.label} open for ${remoteUserId}`)

        try {
          // Send files serially in this queue
          for (const file of queue) {
            // setSendingFile(file) // Update UI to show current file being started
            await sendFileOverChannel(channel, file, totalGlobalSize)
            console.log(
              `File ${file.name} sent to ${remoteUserId} via ${channel.label}`,
            )
          }
          channel.close()
          resolve()
        } catch (error) {
          console.error(`Error in channel ${channel.label}:`, error)
          channel.close()
          reject(error)
        }
      }

      if (channel.readyState === "open") {
        startQueueProcessing()
      } else {
        channel.onopen = startQueueProcessing
      }

      channel.onerror = (err) => {
        console.error(`Channel error ${channel.label}:`, err)
        reject(err)
      }
      channel.onclose = () => {
        console.log(`Channel ${channel.label} closed`)
      }
    })
  }

  /**
   * Sends a single file over the specified data channel in chunks.
   * @param channel the channel used to send the current file
   * @param file the file which is to be sent in chunks
   * @param totalGlobalSize total amount of data to be sent (all the files to all peers)
   * @returns Promise that resolves when the file has been completely sent
   */
  const sendFileOverChannel = async (
    channel: RTCDataChannel,
    file: File,
    totalGlobalSize: number,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const transferId = uuidv4()
      const chunkPayloadSize = CHUNK_SIZE - TRANSFER_CHUNK_HEADER_BYTES
      const expectedChunks = Math.ceil(file.size / chunkPayloadSize)
      let chunkIndex = 0
      let ackTimer: ReturnType<typeof setTimeout> | undefined
      let bufferDrainTimer: ReturnType<typeof setTimeout> | undefined
      let bufferDrainListener: (() => void) | undefined
      let settled = false
      const cleanup = () => {
        if (ackTimer) clearTimeout(ackTimer)
        if (bufferDrainTimer) clearTimeout(bufferDrainTimer)
        if (bufferDrainListener)
          channel.removeEventListener("bufferedamountlow", bufferDrainListener)
        channel.removeEventListener("message", onAck)
        channel.removeEventListener("close", onClose)
      }
      const fail = (error: unknown) => {
        if (settled) return
        settled = true
        cleanup()
        if (channel.readyState === "open") {
          try {
            channel.send(
              JSON.stringify({
                protocol: "window-push-v1",
                kind: "abort",
                transferId,
              }),
            )
          } catch {
            /* channel is already closing */
          }
        }
        reject(error)
      }
      const onAck = (event: MessageEvent) => {
        if (typeof event.data !== "string") return
        try {
          const message = JSON.parse(event.data)
          if (
            message.protocol !== "window-push-v1" ||
            message.kind !== "received" ||
            message.transferId !== transferId
          )
            return
          if (
            message.bytes !== file.size ||
            message.chunks !== expectedChunks
          ) {
            fail(
              new Error(
                "Receiver completion confirmation did not match the file",
              ),
            )
            return
          }
          if (settled) return
          settled = true
          cleanup()
          resolve()
        } catch {
          /* unrelated channel control message */
        }
      }
      const onClose = () =>
        fail(new Error("Channel closed before download confirmation"))

      channel.addEventListener("message", onAck)
      channel.addEventListener("close", onClose)
      const metadata = JSON.stringify({
        protocol: "window-push-v1",
        kind: "start",
        transferId,
        name: file.name,
        type: file.type,
        size: file.size,
        chunks: expectedChunks,
      })

      try {
        channel.send(metadata)
      } catch (error) {
        fail(error)
        return
      }

      // 2. Send chunks
      const fileReader = new FileReader()
      let offset = 0

      fileReader.onerror = (err) => fail(err)

      const readNextSlice = () => {
        if (offset < file.size) {
          const slice = file.slice(offset, offset + chunkPayloadSize)
          fileReader.readAsArrayBuffer(slice)
        } else {
          ackTimer = setTimeout(
            () => fail(new Error("Receiver did not confirm the download")),
            120_000,
          )
        }
      }

      fileReader.onload = (e) => {
        if (!e.target?.result) {
          return fail(new Error("FileReader result is null"))
        }

        const chunk = e.target.result as ArrayBuffer
        const chunkSize = chunk.byteLength

        try {
          const sendChunk = async () => {
            try {
              if (channel.readyState !== "open") {
                fail(new Error("Channel closed"))
                return
              }

              // Basic backpressure handling
              if (channel.bufferedAmount > 10 * 1024 * 1024) {
                if (bufferDrainListener)
                  channel.removeEventListener("bufferedamountlow", bufferDrainListener)
                bufferDrainListener = () => {
                  if (bufferDrainTimer) clearTimeout(bufferDrainTimer)
                  bufferDrainTimer = undefined
                  channel.removeEventListener("bufferedamountlow", bufferDrainListener!)
                  bufferDrainListener = undefined
                  void sendChunk()
                }
                channel.addEventListener("bufferedamountlow", bufferDrainListener, { once: true })
                bufferDrainTimer = setTimeout(
                  () => fail(new Error("Transfer stalled while waiting for network buffer")),
                  30_000,
                )
                return
              }

              const frame = await frameTransferChunk(chunkIndex, chunk)
              channel.send(frame)
              chunkIndex += 1
              offset += chunkSize
              globalTransferredRef.current += chunkSize
              setTransferProgress(
                totalGlobalSize === 0
                  ? 100
                  : (globalTransferredRef.current / totalGlobalSize) * 100,
              )

              readNextSlice()
            } catch (error) {
              fail(error)
            }
          }

          void sendChunk()
        } catch (error) {
          fail(error)
        }
      }

      readNextSlice()
    })
  }

  return {
    sendFile,
  }
}
