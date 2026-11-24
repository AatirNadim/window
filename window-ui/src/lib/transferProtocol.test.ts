import { describe, expect, it } from "vitest"
import { frameTransferChunk, unframeTransferChunk } from "./transferProtocol"

const bytes = (text: string) => new TextEncoder().encode(text).buffer

describe("transfer chunk checks", () => {
  it("round-trips payloads with their sequence number and checksum", async () => {
    const payload = bytes("a verified file chunk")
    const frame = await frameTransferChunk(3, payload)
    const result = await unframeTransferChunk(frame, 3)

    expect(new TextDecoder().decode(result)).toBe("a verified file chunk")
  })

  it("rejects chunks that arrive out of order", async () => {
    const frame = await frameTransferChunk(2, bytes("chunk"))
    await expect(unframeTransferChunk(frame, 1)).rejects.toThrow("out of order")
  })

  it("rejects payloads whose checksum has changed", async () => {
    const frame = await frameTransferChunk(0, bytes("original"))
    new Uint8Array(frame)[40] ^= 0xff
    await expect(unframeTransferChunk(frame, 0)).rejects.toThrow("checksum")
  })
})
