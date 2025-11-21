import { create } from "zustand"

interface FileState {
  filesToBeSent: File[]
  sendingFile: File | null
  receivedFile: {
    name: string
    url: string | null
  }

  receivedFileInfo: {
    name: string
    type: string
    size: number
  } | null

  transferProgress: number
  isSending: boolean
}

interface FileActions {
  addFiles: (files: File[]) => void
  removeFile: (fileName: string) => void
  clearFilesToBeSent: () => void
  setSendingFile: (file: File | null) => void
  setReceivedFile: (file: { name: string; url: string | null }) => void

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
  filesToBeSent: [],
  sendingFile: null,
  receivedFile: {
    name: "",
    url: null,
  },
  receivedFileInfo: null,
  transferProgress: 0,
  isSending: false,
  addFiles: (newFiles) =>
    set((state) => {
      const currentFiles = state.filesToBeSent
      const combinedFiles = [...currentFiles, ...newFiles]

      // Filter out duplicates by name
      const uniqueFiles = combinedFiles.filter(
        (file, index, self) =>
          index === self.findIndex((f) => f.name === file.name),
      )

      // Limit to 10 files
      if (uniqueFiles.length > 10) {
        return { filesToBeSent: uniqueFiles.slice(0, 10) }
      }

      return { filesToBeSent: uniqueFiles }
    }),
  removeFile: (fileName) =>
    set((state) => ({
      filesToBeSent: state.filesToBeSent.filter(
        (file) => file.name !== fileName,
      ),
    })),
  clearFilesToBeSent: () => set({ filesToBeSent: [] }),
  setSendingFile: (file) => set({ sendingFile: file }),
  setReceivedFile: (file) => set({ receivedFile: file }),

  setReceivedFileInfo: (info) => set({ receivedFileInfo: info }),
  setTransferProgress: (progress) => set({ transferProgress: progress }),
  setIsSending: (isSending) => set({ isSending }),
  resetFileStore: () =>
    set({
      filesToBeSent: [],
      sendingFile: null,
      receivedFile: { name: "", url: null },
      receivedFileInfo: null,
      transferProgress: 0,
      isSending: false,
    }),
}))
