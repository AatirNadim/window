import { useFileStore } from "../fileStore"
import { toast } from "sonner"
import { CHUNK_SIZE } from "@/lib/constants"

export const useFile = ({
  peerConnections,
  dataChannelMap,
}: {
  peerConnections: React.RefObject<Record<string, RTCPeerConnection | null>>
  dataChannelMap: React.RefObject<Record<string, RTCDataChannel | null>>
}) => {
  const { setTransferProgress, fileToBeSent, setIsSending } = useFileStore()

  const sendFileUtil = (content: any) => {
    for (const [remoteUserId, channel] of Object.entries(
      dataChannelMap.current,
    )) {
      // Check if channel is open
      if (!channel || ["closed", "closing"].includes(channel.readyState)) {
        toast.error(
          `No data channel for user ${peerConnections.current[remoteUserId]}`,
        )
        continue
      }

      if (channel.readyState === "connecting") {
        toast.error(`Data channel is still connecting for user ${remoteUserId}`)
        continue
      }

      channel.send(content)
    }
  }

  const sendFile = () => {
    console.log("Sending file:", fileToBeSent)
    console.log("Data channel state:", dataChannelMap.current)

    for (const [remoteUserId, pc] of Object.entries(peerConnections.current)) {
      if (!pc) {
        toast.error(
          `No peer connection or data channel for user ${remoteUserId}`,
        )
        return
      }
      if (
        !dataChannelMap.current[remoteUserId] ||
        ["closed", "closing"].includes(
          dataChannelMap.current[remoteUserId]?.readyState || "",
        )
      ) {
        toast.error(`No data channel for user ${remoteUserId}`)
        return
      }
    }

    if (!fileToBeSent) {
      toast.error("No file selected to send")
      console.error("No file selected to send")
      return
    }

    setIsSending(true)
    setTransferProgress(0)

    // 1. Send metadata first
    const metadata = JSON.stringify({
      name: fileToBeSent.name,
      type: fileToBeSent.type,
      size: fileToBeSent.size,
    })

    toast("Sending file...", {
      description: `Sending ${fileToBeSent.name} (${(fileToBeSent.size / 1024 / 1024).toFixed(2)} MB)`,
    })

    sendFileUtil(metadata)

    // 2. Send file in chunks
    const fileReader = new FileReader()
    let offset = 0

    fileReader.onload = (e) => {
      if (e.target?.result) {
        sendFileUtil(e.target.result as ArrayBuffer)
        offset += (e.target.result as ArrayBuffer).byteLength
        setTransferProgress((offset / fileToBeSent.size) * 100)

        if (offset < fileToBeSent.size) {
          readSlice(offset)
        } else {
          toast.success("File Sent", {
            description: `${fileToBeSent.name} has been sent successfully.`,
          })
          setIsSending(false)
        }
      }
    }

    const readSlice = (o: number) => {
      const slice = fileToBeSent.slice(o, o + CHUNK_SIZE)
      fileReader.readAsArrayBuffer(slice)
    }

    readSlice(0)
  }

  return {
    sendFile,
  }
}
