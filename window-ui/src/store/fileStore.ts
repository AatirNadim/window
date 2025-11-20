import { create } from "zustand"

interface FileState {
  fileToBeSent: File | null
  receivedFile: {
    name: string
    url: string | null
  }
  receivedChunks: Array<ArrayBuffer>

  receivedFileInfo: {
    name: string
    type: string
    size: number
  } | null

  transferProgress: number
  isSending: boolean
}

interface FileActions {
  setFileToBeSent: (file: File | null) => void
  setReceivedFile: (file: { name: string; url: string | null }) => void
  clearFileToBeSent: () => void

  addReceivedChunk: (chunk: ArrayBuffer) => void
  clearReceivedChunks: () => void
  setReceivedFileInfo: (
    info: {
      name: string
      type: string
      size: number
    } | null,
  ) => void
  setTransferProgress: (progress: number) => void

  setIsSending: (isSending: boolean) => void

  resetFileStore: () => void
}

export type { FileState }

export const useFileStore = create<FileState & FileActions>()((set) => ({
  fileToBeSent: null,
  receivedFile: {
    name: "",
    url: null,
  },
  receivedChunks: [],
  receivedFileInfo: null,
  transferProgress: 0,
  isSending: false,
  setFileToBeSent: (file) => set({ fileToBeSent: file }),
  setReceivedFile: (file) => set({ receivedFile: file }),
  clearFileToBeSent: () => set({ fileToBeSent: null }),
  addReceivedChunk: (chunk) =>
    set((state) => ({
      receivedChunks: [...state.receivedChunks, chunk],
    })),
  clearReceivedChunks: () => set({ receivedChunks: [] }),
  setReceivedFileInfo: (info) => set({ receivedFileInfo: info }),
  setTransferProgress: (progress) => set({ transferProgress: progress }),
  setIsSending: (isSending) => set({ isSending }),
  resetFileStore: () =>
    set({
      fileToBeSent: null,
      receivedFile: { name: "", url: null },
      receivedChunks: [],
      receivedFileInfo: null,
      transferProgress: 0,
      isSending: false,
    }),
}))
