const CHUNK_SIZE = 64 * 1024 // 64 KB chunk size

const MAX_CHANNELS_FOR_DATA_TRANSMISSION = 5

const serverPort: string = import.meta.env.VITE_SERVER_PORT || "8080"

const serverPath = `${
  import.meta.env.VITE_SERVER_PATH || "localhost"
}:${serverPort}`

export { CHUNK_SIZE, MAX_CHANNELS_FOR_DATA_TRANSMISSION, serverPath }
