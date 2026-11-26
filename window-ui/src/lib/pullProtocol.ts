import type { SharedFileOffer } from "@window/shared"

export const isProtocolId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export const PULL_CONTROL_PROTOCOL = "window-pull-control-v1"

export function isVisibleOffer(offer: SharedFileOffer, peerId: string, now = Date.now()) {
  return offer.expiresAt > now &&
    (offer.visibility === "room" || offer.recipientIds.includes(peerId))
}

export function isValidRemoteOffer(value: unknown, ownerId: string, roomId: string, recipientId: string): value is SharedFileOffer {
  if (!value || typeof value !== "object") return false
  const offer = value as SharedFileOffer
  return isProtocolId(offer.offerId) &&
    offer.ownerId === ownerId && offer.roomId === roomId &&
    typeof offer.ownerName === "string" && offer.ownerName.length <= 64 &&
    typeof offer.name === "string" && offer.name.length > 0 && offer.name.length <= 255 &&
    typeof offer.type === "string" && offer.type.length <= 160 &&
    Number.isSafeInteger(offer.size) && offer.size >= 0 && offer.size <= 50 * 1024 * 1024 &&
    Number.isFinite(offer.createdAt) && Number.isFinite(offer.expiresAt) &&
    offer.expiresAt > Date.now() && offer.expiresAt <= Date.now() + 60 * 60 * 1000 + 30_000 &&
    (offer.visibility === "room" || offer.visibility === "selected") &&
    Array.isArray(offer.recipientIds) && offer.recipientIds.length <= 6 &&
    offer.recipientIds.every((id) => typeof id === "string" && id.length <= 128) &&
    (offer.visibility === "room" ? offer.recipientIds.length === 0 : offer.recipientIds.includes(recipientId))
}
