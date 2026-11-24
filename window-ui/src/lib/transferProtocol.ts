const HEADER_BYTES = 36

export async function frameTransferChunk(index: number, payload: ArrayBuffer) {
  const checksum = new Uint8Array(
    await crypto.subtle.digest("SHA-256", payload),
  )
  const frame = new ArrayBuffer(payload.byteLength + HEADER_BYTES)
  new DataView(frame).setUint32(0, index)
  new Uint8Array(frame, 4, 32).set(checksum)
  new Uint8Array(frame, HEADER_BYTES).set(new Uint8Array(payload))
  return frame
}

export async function unframeTransferChunk(
  frame: ArrayBuffer,
  expectedIndex: number,
) {
  if (frame.byteLength < HEADER_BYTES)
    throw new Error("Transfer chunk header is incomplete")
  if (new DataView(frame).getUint32(0) !== expectedIndex)
    throw new Error("Transfer chunk is missing or out of order")
  const checksum = new Uint8Array(frame.slice(4, HEADER_BYTES))
  const payload = frame.slice(HEADER_BYTES)
  const actual = new Uint8Array(await crypto.subtle.digest("SHA-256", payload))
  if (checksum.some((byte, index) => byte !== actual[index]))
    throw new Error("Transfer chunk checksum did not match")
  return payload
}

export const TRANSFER_CHUNK_HEADER_BYTES = HEADER_BYTES
