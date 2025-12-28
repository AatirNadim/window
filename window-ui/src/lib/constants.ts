const CHUNK_SIZE = 64 * 1024 // 64 KB chunk size

const MAX_CHANNELS_FOR_DATA_TRANSMISSION = 5

const MAX_FILE_SIZE_SINGLE_SEND = 50 // in MB
const MAX_FILE_SIZE_MB_MULTIPLE_SEND = 6
const MAX_FILES_TO_SEND_TOGETHER = 5

const serverPort: string = import.meta.env.VITE_SERVER_PORT || "8080"

const serverPath = import.meta.env.VITE_SERVER_PATH || `localhost:${serverPort}`

export {
  CHUNK_SIZE,
  MAX_CHANNELS_FOR_DATA_TRANSMISSION,
  serverPath,
  MAX_FILE_SIZE_SINGLE_SEND,
  MAX_FILE_SIZE_MB_MULTIPLE_SEND,
  MAX_FILES_TO_SEND_TOGETHER,
}
