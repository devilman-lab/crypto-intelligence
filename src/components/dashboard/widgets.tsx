import type { ReactNode } from 'react'
import type { Ticker } from '@shared/types'
import { Panel } from '@/components/ui/Panel'
import { AssetCell } from '@/components/market/AssetCell'
import { PctChange } from '@/components/market/PctChange'
import { useUiStore } from '@/stores/uiStore'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

export function KpiTile({ label, value, sub, tone, onClick }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'positive' | 'negative' | 'neutral'; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('flex min-w-0 flex-col justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-left', onClick && 'hover:bg-surface-2')}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className={cn('num mt-1 truncate text-lg font-semibold leading-tight', tone === 'positive' && 'text-positive', tone === 'negative' && 'text-negative')}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-fg-muted">{sub}</div>}
    </Comp>
  )
}

interface TickerListProps {
  title: string
  tickers: Ticker[]
  metric: (t: Ticker) => ReactNode
  metricHeader?: string
  emptyText?: string
  actions?: ReactNode
  className?: string
}

/** Compact asset list used by gainers/losers/volume/watchlist widgets. */
export function TickerList({ title, tickers, metric, metricHeader, emptyText = 'No data', actions, className }: TickerListProps) {
  const navigate = useUiStore((s) => s.navigate)
  return (
    <Panel title={title} actions={actions} padded={false} className={className}>
      {tickers.length === 0 ? (
        <div className="p-4 text-center text-xs text-fg-muted">{emptyText}</div>
      ) : (
        <table className="w-full text-[12px]">
          {metricHeader && (
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-fg-subtle">
                <th className="px-3 py-1 text-left font-medium">Asset</th>
                <th className="px-2 py-1 text-right font-medium">Price</th>
                <th className="px-3 py-1 text-right font-medium">{metricHeader}</th>
              </tr>
            </thead>
          )}
          <tbody>
            {tickers.map((t) => (
              <tr key={t.assetId} onClick={() => navigate({ page: 'asset', assetId: t.assetId })} className="cursor-pointer border-t border-border/60 hover:bg-surface-2">
                <td className="max-w-0 px-3 py-1.5">
                  <AssetCell ticker={t} showName={false} />
                </td>
                <td className="num whitespace-nowrap px-2 py-1.5 text-right">{formatCurrency(t.price)}</td>
                <td className="num whitespace-nowrap px-3 py-1.5 text-right">{metric(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

export function ChangeMetric({ value }: { value: number | null }) {
  return <PctChange value={value} />
}
