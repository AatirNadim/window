export const CHUNK_SIZE = 64 * 1024 // 64 KB chunk size

const serverPort: string = import.meta.env.VITE_SERVER_PORT || "8080"

export const serverPath = `${
  import.meta.env.VITE_SERVER_PATH || "localhost"
}:${serverPort}`
