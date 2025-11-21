import { useFileStore } from "../fileStore"
import { toast } from "sonner"
import { CHUNK_SIZE, MAX_CHANNELS_FOR_DATA_TRANSMISSION } from "@/lib/constants"
import { useRef } from "react"

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

    const peers = Object.entries(peerConnections.current)
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

      await Promise.all(peerPromises)

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

    await Promise.all(channelPromises)
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
      // 1. Send metadata (Delimiter)
      const metadata = JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size,
      })

      try {
        channel.send(metadata)
      } catch (error) {
        return reject(error)
      }

      // 2. Send chunks
      const fileReader = new FileReader()
      let offset = 0

      fileReader.onerror = (err) => reject(err)

      const readNextSlice = () => {
        if (offset < file.size) {
          const slice = file.slice(offset, offset + CHUNK_SIZE)
          fileReader.readAsArrayBuffer(slice)
        } else {
          resolve()
        }
      }

      fileReader.onload = (e) => {

        if (!e.target?.result) {
          return reject(new Error("FileReader result is null"))
        }
        
        const chunk = e.target.result as ArrayBuffer
        const chunkSize = chunk.byteLength

        try {
          const sendChunk = () => {
            if (channel.readyState !== "open") {
              reject(new Error("Channel closed"))
              return
            }

            // Basic backpressure handling
            if (channel.bufferedAmount > 10 * 1024 * 1024) {
              // Wait for buffer to drain
              const onBufferedAmountLow = () => {
                channel.removeEventListener(
                  "bufferedamountlow",
                  onBufferedAmountLow,
                )
                sendChunk()
              }
              channel.addEventListener("bufferedamountlow", onBufferedAmountLow)
              return
            }

            channel.send(chunk)
            offset += chunkSize
            globalTransferredRef.current += chunkSize
            setTransferProgress(
              (globalTransferredRef.current / totalGlobalSize) * 100,
            )

            readNextSlice()
          }

          sendChunk()
        } catch (error) {
          reject(error)
        }
      }

      readNextSlice()
    })
  }

  return {
    sendFile,
  }
}
