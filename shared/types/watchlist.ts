export interface Watchlist {
  id: number
  name: string
  createdAt: number
  /** Ordered asset ids. */
  items: WatchlistItem[]
}

export interface WatchlistItem {
  assetId: string
  symbol: string
  position: number
  addedAt: number
}
