import { create } from "zustand"

interface FileState {
  file: File | null
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

  setFile: (file: File | null) => void
  setReceivedFile: (file: { name: string; url: string | null }) => void
  clearFile: () => void

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

export const useFileStore = create<FileState>()((set) => ({
  file: null,
  receivedFile: {
    name: "",
    url: null,
  },
  receivedChunks: [],
  receivedFileInfo: null,
  transferProgress: 0,
  isSending: false,
  setFile: (file) => set({ file }),
  setReceivedFile: (file) => set({ receivedFile: file }),
  clearFile: () => set({ file: null }),
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
      file: null,
      receivedFile: { name: "", url: null },
      receivedChunks: [],
      receivedFileInfo: null,
      transferProgress: 0,
      isSending: false,
    }),
}))
