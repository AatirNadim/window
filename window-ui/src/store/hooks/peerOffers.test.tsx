// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { SharedFileOffer } from "@window/shared"
import { useSocket } from "./socketHook"
import { useUserStore } from "../userStore"
import { usePullStore } from "../pullStore"

const offerId = "11111111-1111-4111-8111-111111111111"
const requestId = "22222222-2222-4222-8222-222222222222"
class Channel {
  label = "fileTransfer"
  readyState = "open"
  sent: Array<Record<string, unknown> & { offers: SharedFileOffer[] }> = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  send(data: string) { this.sent.push(JSON.parse(data)) }
  receive(data: object) { this.onmessage?.({ data: JSON.stringify({ protocol: "window-pull-control-v1", ...data }) }) }
}
class PeerConnection {
  static latest: PeerConnection
  channel = new Channel()
  ondatachannel: ((event: { channel: Channel }) => void) | null = null
  constructor() { PeerConnection.latest = this }
  createDataChannel() { return this.channel }
  async createOffer() { return { type: "offer", sdp: "" } }
  async setLocalDescription() {}
  close() {}
}
const makeOffer = (changes: Partial<SharedFileOffer> = {}): SharedFileOffer => ({
  offerId, ownerId: "self", ownerName: "Self", roomId: "room", name: "test.txt", type: "text/plain", size: 0,
  createdAt: Date.now(), expiresAt: Date.now() + 60_000, visibility: "room", recipientIds: [], ...changes,
})

describe("peer offer exchange", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("RTCPeerConnection", PeerConnection)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ iceServers: [{ urls: "stun:test" }] }) }))
    useUserStore.setState({ userId: "self", userName: "Self", roomId: "room", remoteUsers: {} })
    usePullStore.getState().clearPullState()
  })
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); usePullStore.getState().clearPullState() })

  async function setup() {
    const hook = renderHook(() => useSocket())
    await act(async () => { await hook.result.current.createPeerConnection("peer", "Peer"); await hook.result.current.createOffer("peer") })
    return { hook, pc: PeerConnection.latest, channel: PeerConnection.latest.channel }
  }

  it("sends only eligible, unexpired local offers when a channel opens, then announces expiry", async () => {
    const { hook, channel } = await setup()
    const file = new File([], "test.txt", { type: "text/plain" })
    act(() => {
      hook.result.current.publishFileOffer(makeOffer(), file)
      hook.result.current.publishFileOffer(makeOffer({ offerId: "33333333-3333-4333-8333-333333333333", visibility: "selected", recipientIds: ["other"] }), file)
      channel.sent = []
      channel.onopen?.()
    })
    expect(channel.sent[0].offers.map((offer: SharedFileOffer) => offer.offerId)).toEqual([offerId])
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(channel.sent.some((message) => message.type === "file-offer-removed" && message.offerId === offerId)).toBe(true)
    expect(usePullStore.getState().files[offerId]).toBeUndefined()
  })

  it("replaces a peer snapshot, rejects spoofed offers, and clears offers on disconnect without replacing the control channel for push", async () => {
    const { hook, channel, pc } = await setup()
    const remote = makeOffer({ ownerId: "peer", ownerName: "Peer" })
    act(() => { channel.receive({ type: "file-offer-snapshot", offers: [remote] }) })
    expect(usePullStore.getState().offers).toEqual([remote])
    act(() => { channel.receive({ type: "file-offer-added", offer: { ...remote, ownerId: "other" } }) })
    expect(usePullStore.getState().offers).toEqual([remote])
    const push = new Channel(); push.label = "transfer-queue-1"
    act(() => { pc.ondatachannel?.({ channel: push }); push.onclose?.() })
    expect(hook.result.current.dataChannelMap.current.peer).toBe(channel)
    act(() => { channel.receive({ type: "file-offer-snapshot", offers: [] }) })
    expect(usePullStore.getState().offers).toEqual([])
    act(() => { channel.receive({ type: "file-offer-added", offer: remote }); channel.onclose?.() })
    expect(usePullStore.getState().offers).toEqual([])
  })

  it("enforces selected audiences and expiry at the owner when a peer requests a file", async () => {
    const { hook, channel } = await setup()
    const file = new File([], "test.txt", { type: "text/plain" })
    act(() => { hook.result.current.publishFileOffer(makeOffer({ visibility: "selected", recipientIds: ["other"] }), file) })
    act(() => { channel.receive({ type: "file-pull-request", offerId, requestId }) })
    expect(channel.sent.at(-1)).toMatchObject({ type: "file-pull-decision", accepted: false })
    act(() => { vi.advanceTimersByTime(60_000); channel.receive({ type: "file-pull-request", offerId, requestId }) })
    expect(channel.sent.at(-1)).toMatchObject({ type: "file-pull-decision", accepted: false })
  })
  it("accepts an eligible pull over the data channel and validates its completion", async () => {
    const { hook, channel } = await setup()
    const file = new File([], "test.txt", { type: "text/plain" })
    act(() => { hook.result.current.publishFileOffer(makeOffer(), file); channel.sent = [] })
    await act(async () => { channel.receive({ type: "file-pull-request", offerId, requestId }) })
    expect(channel.sent.map((message) => message.kind || message.type)).toEqual(["file-pull-decision", "start", "end"])
    expect(channel.sent[0]).toMatchObject({ accepted: true, requestId })
    act(() => { channel.receive({ type: "finish-file-pull", offerId, requestId, bytes: 0, chunks: 0 }) })
    channel.sent = []
    await act(async () => { channel.receive({ type: "file-pull-request", offerId, requestId: "44444444-4444-4444-8444-444444444444" }) })
    expect(channel.sent[0]).toMatchObject({ type: "file-pull-decision", accepted: true })
  })

  it("ignores a decision with the wrong request id and times out an unanswered request", async () => {
    const { hook, channel } = await setup()
    const remote = makeOffer({ ownerId: "peer", ownerName: "Peer" })
    act(() => { channel.receive({ type: "file-offer-added", offer: remote }); hook.result.current.requestFilePull(remote) })
    expect(usePullStore.getState().statuses[offerId]).toBe("requesting")
    act(() => { channel.receive({ type: "file-pull-decision", offerId, requestId, accepted: true }) })
    expect(usePullStore.getState().statuses[offerId]).toBe("requesting")
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(usePullStore.getState().statuses[offerId]).toBe("idle")
    expect(channel.sent.some((message) => message.type === "cancel-file-pull")).toBe(true)
  })

  it("answers expired requests after releasing the file, without exposing restricted offers", async () => {
    const { hook, channel } = await setup()
    const file = new File([], "test.txt", { type: "text/plain" })
    act(() => { hook.result.current.publishFileOffer(makeOffer(), file); vi.advanceTimersByTime(60_000) })
    expect(usePullStore.getState().files[offerId]).toBeUndefined()
    act(() => { channel.receive({ type: "file-pull-request", offerId, requestId }) })
    expect(channel.sent.at(-1)).toMatchObject({ accepted: false, reason: "This file offer has expired. Ask the sender to offer the file again." })
    act(() => { vi.advanceTimersByTime(120_000); channel.receive({ type: "file-pull-request", offerId, requestId }) })
    expect(channel.sent.at(-1)).toMatchObject({ accepted: false, reason: "The sender is unavailable. Try again later." })
  })

  it("sends a request for a stale visible offer so the host can explain expiry", async () => {
    const { hook, channel } = await setup()
    const remote = makeOffer({ ownerId: "peer", ownerName: "Peer" })
    act(() => { channel.receive({ type: "file-offer-added", offer: remote }); vi.setSystemTime(remote.expiresAt + 1); hook.result.current.requestFilePull(remote) })
    expect(channel.sent.at(-1)).toMatchObject({ type: "file-pull-request", offerId })
  })

})
