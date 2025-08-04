import { useState } from "react"
import { useFileStore } from "../fileStore"
import { toast } from "sonner"
import { useSocket } from "./socketHook"
import { CHUNK_SIZE } from "@/lib/constants"

export const useFile = () => {
  

  const { setTransferProgress, file, setFile, setIsSending } = useFileStore()

  const { dataChannelRef } = useSocket()

  const sendFile = () => {
    if (
      !file ||
      !dataChannelRef.current ||
      dataChannelRef.current.readyState !== "open"
    ) {
      toast.error("Cannot send file", {
        description: "No file selected or connection not ready.",
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

    toast("Sending file...", {
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
