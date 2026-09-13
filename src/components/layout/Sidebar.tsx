import {
  LayoutDashboard,
  CandlestickChart,
  Activity,
  Filter,
  LineChart,
  History,
  Briefcase,
  FlaskConical,
  NotebookPen,
  Bell,
  Star,
  Settings,
  type LucideIcon
} from 'lucide-react'
import { useUiStore, type Page } from '@/stores/uiStore'
import { cn } from '@/lib/cn'
import { Logo } from './Logo'

interface NavItem {
  page: Page
  label: string
  icon: LucideIcon
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Market',
    items: [
      { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { page: 'markets', label: 'Markets', icon: CandlestickChart },
      { page: 'volatility', label: 'Volatility', icon: Activity },
      { page: 'screener', label: 'Screener', icon: Filter },
      { page: 'analysis', label: 'Technical Analysis', icon: LineChart },
      { page: 'history', label: 'Historical Analysis', icon: History }
    ]
  },
  {
    group: 'Personal',
    items: [
      { page: 'portfolio', label: 'Portfolio', icon: Briefcase },
      { page: 'paper', label: 'Paper Trading', icon: FlaskConical },
      { page: 'journal', label: 'Trading Journal', icon: NotebookPen },
      { page: 'alerts', label: 'Alerts', icon: Bell },
      { page: 'watchlist', label: 'Watchlist', icon: Star }
    ]
  }
]

export function Sidebar() {
  const route = useUiStore((s) => s.route)
  const navigate = useUiStore((s) => s.navigate)
  const active = route.page === 'asset' ? 'markets' : route.page

  return (
    <aside className="flex w-[210px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-12 items-center gap-2 border-b border-border px-3">
        <Logo className="h-6 w-6" />
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight">Crypto Intelligence</div>
          <div className="text-[10px] text-fg-subtle">Market analytics</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((g) => (
          <div key={g.group} className="mb-2">
            <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{g.group}</div>
            {g.items.map((item) => (
              <NavButton key={item.page} item={item} active={active === item.page} onClick={() => navigate({ page: item.page })} />
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-border py-2">
        <NavButton item={{ page: 'settings', label: 'Settings', icon: Settings }} active={active === 'settings'} onClick={() => navigate({ page: 'settings' })} />
      </div>
    </aside>
  )
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative mx-1.5 flex h-8 w-[calc(100%-12px)] items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors',
        active ? 'bg-accent-soft text-fg font-medium' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
      )}
    >
      {active && <span className="absolute left-0 top-1.5 h-5 w-0.5 rounded-r bg-accent" />}
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : '')} />
      <span className="truncate">{item.label}</span>
    </button>
  )
}
