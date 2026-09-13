import { Plus, X } from 'lucide-react'
import { FIELD_META, OPERATOR_LABEL, newCondition, type ScreenCondition, type ScreenDefinition, type ScreenField, type ScreenOperator } from '@shared/analysis/screener'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/cn'

const FIELD_OPTIONS = (Object.entries(FIELD_META) as [ScreenField, (typeof FIELD_META)[ScreenField]][])
  .sort((a, b) => a[1].group.localeCompare(b[1].group) || a[1].label.localeCompare(b[1].label))
  .map(([value, meta]) => ({ value, label: `${meta.group} · ${meta.label}` }))

const OP_OPTIONS = (Object.keys(OPERATOR_LABEL) as ScreenOperator[]).map((value) => ({ value, label: OPERATOR_LABEL[value] }))

const UNIT_SUFFIX: Record<string, string> = { pct: '%', usd: 'USD', ratio: '', number: '', x: '×' }

interface Props {
  value: ScreenDefinition
  onChange: (next: ScreenDefinition) => void
}

/** Visual builder for a ScreenDefinition: a list of rows combined with AND / OR. */
export function ConditionEditor({ value, onChange }: Props) {
  const update = (id: string, patch: Partial<ScreenCondition>) =>
    onChange({ ...value, conditions: value.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  const remove = (id: string) => onChange({ ...value, conditions: value.conditions.filter((c) => c.id !== id) })
  const add = () => onChange({ ...value, conditions: [...value.conditions, newCondition()] })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <span>Match</span>
        <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
          {(['and', 'or'] as const).map((l) => (
            <button key={l} type="button" onClick={() => onChange({ ...value, logic: l })} className={cn('h-5 rounded-sm px-2 text-[11px] font-semibold uppercase', value.logic === l ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}>
              {l === 'and' ? 'All' : 'Any'}
            </button>
          ))}
        </div>
        <span>of the following conditions</span>
      </div>

      {value.conditions.map((c) => {
        const meta = FIELD_META[c.field]
        const suffix = UNIT_SUFFIX[meta.unit]
        return (
          <div key={c.id} className="flex flex-wrap items-center gap-1.5">
            <Tooltip content={meta.description}>
              <div>
                <Select value={c.field} options={FIELD_OPTIONS} onValueChange={(field) => update(c.id, { field })} className="w-56" aria-label="Field" />
              </div>
            </Tooltip>
            <Select value={c.op} options={OP_OPTIONS} onValueChange={(op) => update(c.id, { op, value2: op === 'between' ? (c.value2 ?? c.value) : undefined })} className="w-24" aria-label="Operator" />
            <NumberInput value={c.value} onChange={(v) => update(c.id, { value: v })} suffix={suffix} />
            {c.op === 'between' && (
              <>
                <span className="text-xs text-fg-muted">and</span>
                <NumberInput value={c.value2 ?? c.value} onChange={(v) => update(c.id, { value2: v })} suffix={suffix} />
              </>
            )}
            <Button size="icon" variant="ghost" aria-label="Remove condition" onClick={() => remove(c.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      })}

      <Button size="sm" variant="ghost" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Add condition
      </Button>
    </div>
  )
}

function NumberInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="relative">
      <Input
        type="number"
        step="any"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(n)
        }}
        className={cn('num w-32', suffix && 'pr-9')}
        aria-label="Value"
      />
      {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-fg-subtle">{suffix}</span>}
    </div>
  )
}
