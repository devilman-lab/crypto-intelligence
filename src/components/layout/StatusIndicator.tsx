import { useEffect, useState } from 'react'
import { useConnectivityStore } from '@/stores/connectivityStore'
import { formatRelativeTime } from '@/lib/format'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/cn'

/** "● Live Market Data / Updated 15s ago" or "○ Offline / Showing cached data". */
export function StatusIndicator() {
  const { online, lastMarketUpdateAt, reason } = useConnectivityStore()
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const label = online ? 'Live Market Data' : 'Offline'
  const detail = online
    ? lastMarketUpdateAt
      ? `Updated ${formatRelativeTime(lastMarketUpdateAt)}`
      : 'Waiting for data'
    : 'Showing cached data'

  return (
    <Tooltip content={reason ?? (online ? 'Connected to the market data provider.' : 'No internet connection. Portfolio, journal and cached data remain available.')}>
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1">
        <span className={cn('h-2 w-2 rounded-full', online ? 'bg-positive shadow-[0_0_6px_var(--positive)]' : 'border border-fg-subtle')} />
        <div className="leading-tight">
          <div className="text-[11px] font-medium">{label}</div>
          <div className="text-[10px] text-fg-subtle">{detail}</div>
        </div>
      </div>
    </Tooltip>
  )
}
