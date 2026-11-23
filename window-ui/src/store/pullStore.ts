import { create } from "zustand"
import type { SharedFileOffer } from "@window/shared"

export type PullStatus = "idle" | "requesting" | "downloading" | "unavailable"
interface PullState {
  offers: SharedFileOffer[]
  files: Record<string, File>
  statuses: Record<string, PullStatus>
  progress: Record<string, number>
  setOffers: (offers: SharedFileOffer[]) => void
  upsertOffer: (offer: SharedFileOffer) => void
  removeOffer: (offerId: string) => void
  addLocalOffer: (offer: SharedFileOffer, file: File) => void
  setStatus: (offerId: string, status: PullStatus) => void
  setProgress: (offerId: string, progress: number) => void
  clearPullState: () => void
}

export const usePullStore = create<PullState>((set) => ({
  offers: [],
  files: {},
  statuses: {},
  progress: {},
  setOffers: (offers) => set({ offers }),
  upsertOffer: (offer) =>
    set((state) => ({
      offers: [
        ...state.offers.filter((item) => item.offerId !== offer.offerId),
        offer,
      ],
    })),
  removeOffer: (offerId) =>
    set((state) => {
      const files = { ...state.files }
      delete files[offerId]
      const statuses = { ...state.statuses }
      delete statuses[offerId]
      const progress = { ...state.progress }
      delete progress[offerId]
      return {
        offers: state.offers.filter((item) => item.offerId !== offerId),
        files,
        statuses,
        progress,
      }
    }),
  addLocalOffer: (offer, file) =>
    set((state) => ({
      offers: [
        ...state.offers.filter((item) => item.offerId !== offer.offerId),
        offer,
      ],
      files: { ...state.files, [offer.offerId]: file },
    })),
  setStatus: (offerId, status) =>
    set((state) => ({ statuses: { ...state.statuses, [offerId]: status } })),
  setProgress: (offerId, progress) =>
    set((state) => ({ progress: { ...state.progress, [offerId]: progress } })),
  clearPullState: () =>
    set({ offers: [], files: {}, statuses: {}, progress: {} }),
}))
