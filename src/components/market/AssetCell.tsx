import type { Ticker } from '@shared/types'

export function AssetCell({ ticker, showName = true }: { ticker: Pick<Ticker, 'symbol' | 'name' | 'imageUrl'>; showName?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {ticker.imageUrl ? (
        <img src={ticker.imageUrl} alt="" width={20} height={20} className="h-5 w-5 shrink-0 rounded-full" loading="lazy" />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[9px] font-semibold text-fg-muted">{ticker.symbol.slice(0, 3)}</span>
      )}
      <span className="min-w-0 truncate">
        <span className="font-semibold">{ticker.symbol}</span>
        {showName && <span className="ml-1.5 text-fg-muted">{ticker.name}</span>}
      </span>
    </div>
  )
}
