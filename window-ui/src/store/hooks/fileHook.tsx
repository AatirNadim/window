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
  const { setTransferProgress, file, setFile, setIsSending } = useFileStore()

  const sendFileUtil = (content: any) => {
    for (const [remoteUserId, channel] of Object.entries(
      dataChannelMap.current,
    )) {
      if (!channel) {
        toast.error(`No data channel for user ${peerConnections.current[remoteUserId]}`)
        continue
      }

      channel.send(content)
    }
  }

  const sendFile = () => {
    console.log("Sending file:", file)
    console.log("Data channel state:", dataChannelMap.current)

    for (const [remoteUserId, pc] of Object.entries(peerConnections.current)) {
      if (!pc || !dataChannelMap.current[remoteUserId]) {
        toast.error(
          `No peer connection or data channel for user ${remoteUserId}`,
        )
      }
    }

    if (!file) {
      toast.error("No file selected to send")
      console.error("No file selected to send")
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

    toast("Sending file...", {
      description: `Sending ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
    })

    sendFileUtil(metadata)

    // 2. Send file in chunks
    const fileReader = new FileReader()
    let offset = 0

    fileReader.onload = (e) => {
      if (e.target?.result) {
        sendFileUtil(e.target.result as ArrayBuffer)
        offset += (e.target.result as ArrayBuffer).byteLength
        setTransferProgress((offset / file.size) * 100)

        if (offset < file.size) {
          readSlice(offset)
        } else {
          toast.success("File Sent", {
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

  return {
    sendFile,
  }
}
