import { Star } from 'lucide-react'
import { useWatchlistStore } from '@/stores/watchlistStore'
import { cn } from '@/lib/cn'

/** Star toggle: adds to / removes from the watchlist containing the asset (or the active one). */
export function WatchStar({ assetId, className }: { assetId: string; className?: string }) {
  const watched = useWatchlistStore((s) => s.lists.some((l) => l.items.some((i) => i.assetId === assetId)))
  const toggle = useWatchlistStore((s) => s.toggle)
  return (
    <button
      type="button"
      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-pressed={watched}
      onClick={(e) => {
        e.stopPropagation()
        void toggle(assetId)
      }}
      className={cn('inline-flex rounded p-1 text-fg-subtle hover:text-warning', watched && 'text-warning', className)}
    >
      <Star className="h-3.5 w-3.5" fill={watched ? 'currentColor' : 'none'} />
    </button>
  )
}
