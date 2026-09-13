import { ColorType, type DeepPartial, type ChartOptions } from 'lightweight-charts'

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Chart options derived from the active CSS theme tokens. */
export function chartOptions(): DeepPartial<ChartOptions> {
  const border = cssVar('--border')
  return {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: cssVar('--fg-muted'),
      fontFamily: cssVar('--font-sans') || 'Inter, system-ui, sans-serif',
      fontSize: 11,
      attributionLogo: false
    },
    grid: { vertLines: { color: border }, horzLines: { color: border } },
    rightPriceScale: { borderColor: border },
    timeScale: { borderColor: border, timeVisible: true, secondsVisible: false, rightOffset: 4 },
    crosshair: { mode: 0 },
    localization: {
      locale: 'en-US',
      priceFormatter: (p: number) => (Math.abs(p) >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.toLocaleString('en-US', { maximumFractionDigits: Math.abs(p) >= 1 ? 2 : Math.abs(p) >= 0.01 ? 4 : 6 }))
    }
  }
}

export function chartColors() {
  return {
    up: cssVar('--positive'),
    down: cssVar('--negative'),
    accent: cssVar('--accent'),
    muted: cssVar('--fg-subtle'),
    warning: cssVar('--warning')
  }
}
