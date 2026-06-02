import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { sqlIdent } from '@/features/playground/_shared/duckdb'
import type { DatasetField, FilterRule } from '../../chart-engine/types'

interface Props {
  rule: FilterRule
  field: DatasetField
  /** Dataset's active view table — used to fetch distinct values / min-max. */
  tableName: string
  /** DuckDB query callback (shared connection). */
  query: (sql: string) => Promise<Array<Record<string, unknown>>>
  onChange: (patch: Partial<FilterRule>) => void
  disabled?: boolean
}

const MAX_DISTINCT_VALUES = 500

/**
 * Tableau-style filter value editor (replaces the generic operator+input).
 *
 * - quantitative / temporal: from/to inputs. Maps to BETWEEN / ≥ / ≤ / no-op.
 * - nominal / ordinal: searchable multi-select of distinct values. Maps to IN.
 */
export function TableauFilterValueEditor({
  rule,
  field,
  tableName,
  query,
  onChange,
  disabled,
}: Props) {
  const { t } = useTranslation()

  // `t` is read inside each subcomponent via its own useTranslation hook —
  // re-importing here only to keep the top-level component subscribed.
  void t

  if (
    field.semanticType === 'quantitative' ||
    field.semanticType === 'temporal'
  ) {
    return (
      <RangeEditor
        rule={rule}
        field={field}
        tableName={tableName}
        query={query}
        onChange={onChange}
        disabled={disabled}
      />
    )
  }
  return (
    <MultiSelectEditor
      rule={rule}
      field={field}
      tableName={tableName}
      query={query}
      onChange={onChange}
      disabled={disabled}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Range editor — quantitative / temporal
// ─────────────────────────────────────────────────────────────────────────────

function RangeEditor({
  rule,
  field,
  tableName,
  query,
  onChange,
  disabled,
}: Props) {
  const { t } = useTranslation()
  const [bounds, setBounds] = useState<{ min: unknown; max: unknown } | null>(
    null,
  )
  const [boundsError, setBoundsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset stale range before re-fetching when field/table changes
    setBounds(null)
    setBoundsError(null)
    const fetchBounds = async () => {
      try {
        const sql = `
SELECT MIN(${sqlIdent(field.name)}) AS lo,
       MAX(${sqlIdent(field.name)}) AS hi
FROM ${sqlIdent(tableName)}
        `.trim()
        const rows = await query(sql)
        if (cancelled) return
        const row = rows[0] as Record<string, unknown> | undefined
        setBounds({ min: row?.lo ?? null, max: row?.hi ?? null })
      } catch (err) {
        if (!cancelled) {
          setBoundsError(err instanceof Error ? err.message : 'Range failed')
        }
      }
    }
    void fetchBounds()
    return () => {
      cancelled = true
    }
  }, [field.name, tableName, query])

  const isTemporal = field.semanticType === 'temporal'
  const inputType = isTemporal ? 'text' : 'number'

  // Extract from/to from rule. We canonicalise on `between` with [from, to].
  // Backward-compat: gte → [value, null], lte → [null, value].
  const { from, to } = readRange(rule)

  const update = (next: { from?: unknown; to?: unknown }) => {
    const newFrom = 'from' in next ? next.from : from
    const newTo = 'to' in next ? next.to : to
    onChange({
      operator: 'between',
      value: [
        normaliseInput(newFrom, isTemporal),
        normaliseInput(newTo, isTemporal),
      ],
    })
  }

  return (
    <div className="space-y-2">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {t('filter.range', 'Range')}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <label className="space-y-0.5">
          <span className="block text-[9px] uppercase tracking-wide text-muted-foreground/70">
            {t('filter.from', 'From')}
          </span>
          <input
            className="h-7 w-full rounded-sm border border-border bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
            onChange={(event) => update({ from: event.target.value })}
            placeholder={bounds ? String(bounds.min ?? '') : '…'}
            type={inputType}
            value={displayValue(from)}
          />
        </label>
        <label className="space-y-0.5">
          <span className="block text-[9px] uppercase tracking-wide text-muted-foreground/70">
            {t('filter.to', 'To')}
          </span>
          <input
            className="h-7 w-full rounded-sm border border-border bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
            onChange={(event) => update({ to: event.target.value })}
            placeholder={bounds ? String(bounds.max ?? '') : '…'}
            type={inputType}
            value={displayValue(to)}
          />
        </label>
      </div>
      {bounds && !boundsError ? (
        <div className="text-[10px] text-muted-foreground">
          {t('filter.dataRange', 'data')}: {String(bounds.min ?? '∅')} —{' '}
          {String(bounds.max ?? '∅')}
        </div>
      ) : null}
      {boundsError ? (
        <div className="text-[10px] text-destructive">{boundsError}</div>
      ) : null}
    </div>
  )
}

function readRange(rule: FilterRule): { from: unknown; to: unknown } {
  if (rule.operator === 'between' && Array.isArray(rule.value)) {
    const [from, to] = rule.value as [unknown, unknown]
    return { from, to }
  }
  if (rule.operator === 'gte' || rule.operator === 'gt') {
    return { from: rule.value, to: null }
  }
  if (rule.operator === 'lte' || rule.operator === 'lt') {
    return { from: null, to: rule.value }
  }
  if (rule.operator === 'eq') {
    return { from: rule.value, to: rule.value }
  }
  return { from: null, to: null }
}

function displayValue(value: unknown): string | number {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value
  return String(value)
}

function normaliseInput(value: unknown, isTemporal: boolean): unknown {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return value
  if (isTemporal) return value // leave as ISO-ish string; DuckDB casts
  const n = Number(value)
  return Number.isFinite(n) ? n : value
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-select editor — nominal / ordinal
// ─────────────────────────────────────────────────────────────────────────────

function MultiSelectEditor({
  rule,
  field,
  tableName,
  query,
  onChange,
  disabled,
}: Props) {
  const { t } = useTranslation()
  const [values, setValues] = useState<unknown[] | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset stale values before re-fetching when field/table changes
    setValues(null)
    setError(null)
    setTruncated(false)
    const fetchValues = async () => {
      try {
        const sql = `
SELECT DISTINCT ${sqlIdent(field.name)} AS v
FROM ${sqlIdent(tableName)}
WHERE ${sqlIdent(field.name)} IS NOT NULL
ORDER BY 1
LIMIT ${MAX_DISTINCT_VALUES + 1}
        `.trim()
        const rows = await query(sql)
        if (cancelled) return
        const all = rows.map((r) => (r as Record<string, unknown>).v)
        if (all.length > MAX_DISTINCT_VALUES) {
          setTruncated(true)
          setValues(all.slice(0, MAX_DISTINCT_VALUES))
        } else {
          setValues(all)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Distinct failed')
        }
      }
    }
    void fetchValues()
    return () => {
      cancelled = true
    }
  }, [field.name, tableName, query])

  const selected: unknown[] = useMemo(() => {
    if (rule.operator === 'in' && Array.isArray(rule.value)) return rule.value
    if (rule.operator === 'eq' && rule.value !== null && rule.value !== '') {
      return [rule.value]
    }
    return []
  }, [rule.operator, rule.value])

  const selectedSet = useMemo(
    () => new Set(selected.map((v) => String(v))),
    [selected],
  )

  const filtered = useMemo(() => {
    if (!values) return [] as unknown[]
    if (!search.trim()) return values
    const needle = search.toLowerCase()
    return values.filter((v) =>
      String(v ?? '')
        .toLowerCase()
        .includes(needle),
    )
  }, [values, search])

  const toggle = (value: unknown) => {
    const key = String(value)
    let next: unknown[]
    if (selectedSet.has(key)) {
      next = selected.filter((v) => String(v) !== key)
    } else {
      next = [...selected, value]
    }
    onChange({ operator: 'in', value: next })
  }

  const setAll = (all: boolean) => {
    if (!values) return
    onChange({ operator: 'in', value: all ? [...values] : [] })
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          {t('filter.values', 'Values')}
        </span>
        <div className="flex items-center gap-1 text-[10px]">
          <button
            className="text-muted-foreground hover:text-foreground disabled:opacity-40"
            disabled={disabled || !values}
            onClick={() => setAll(true)}
            type="button"
          >
            {t('filter.all', 'All')}
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button
            className="text-muted-foreground hover:text-foreground disabled:opacity-40"
            disabled={disabled || selected.length === 0}
            onClick={() => setAll(false)}
            type="button"
          >
            {t('filter.none', 'None')}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-7 w-full rounded-sm border border-border bg-background pl-7 pr-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={disabled || !values}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('filter.searchValues', 'Search…')}
          value={search}
        />
      </div>

      <div className="max-h-40 overflow-auto rounded-sm border border-border bg-background">
        {values === null && !error ? (
          <div className="p-2 text-center text-[10px] text-muted-foreground">
            {t('filter.loading', 'Loading…')}
          </div>
        ) : null}
        {error ? (
          <div className="p-2 text-[10px] text-destructive">{error}</div>
        ) : null}
        {values && filtered.length === 0 ? (
          <div className="p-2 text-center text-[10px] text-muted-foreground">
            {t('filter.noValues', 'No matches')}
          </div>
        ) : null}
        {filtered.map((value, idx) => {
          const key = String(value)
          const isOn = selectedSet.has(key)
          return (
            <label
              key={`${key}_${idx}`}
              className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px] hover:bg-muted/50"
            >
              <Checkbox
                checked={isOn}
                disabled={disabled}
                onCheckedChange={() => toggle(value)}
              />
              <span className="truncate" title={key}>
                {key}
              </span>
            </label>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {selected.length} {t('filter.selected', 'selected')}
        </span>
        {truncated ? (
          <span title={`Showing first ${MAX_DISTINCT_VALUES} values`}>
            ⚠ {t('filter.truncated', 'list truncated')}
          </span>
        ) : null}
      </div>
    </div>
  )
}
