import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/cn'

export function PctChange({ value, digits = 2, className }: { value: number | null | undefined; digits?: number; className?: string }) {
  if (value == null || !Number.isFinite(value)) return <span className="num text-fg-subtle">—</span>
  const tone = value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : 'text-fg-muted'
  return <span className={cn('num', tone, className)}>{formatPercent(value, digits)}</span>
}
