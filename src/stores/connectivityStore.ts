import { create } from 'zustand'
import type { ConnectivityStatus } from '@shared/types'

interface ConnectivityState extends ConnectivityStatus {
  set: (s: ConnectivityStatus) => void
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  online: navigator.onLine,
  lastMarketUpdateAt: null,
  set: (s) => set(s)
}))
