import { Binary, CalendarDays, Hash, Type } from 'lucide-react'
import { useMemo } from 'react'

import type { SailorColumn } from '../sailorTypes'
import {
  CompletionDonut,
  HistogramMiniChart,
  NumericStatsLine,
} from './ProfileMiniCharts'
import { buildOverviewRows } from './profileRows'
import { buildResultProfile } from './resultProfileBuilder'

interface QueryResultProfilePanelProps {
  columns: string[]
  rows: Array<Record<string, unknown>>
}

function getTypeIcon(semanticType: SailorColumn['semanticType']) {
  if (semanticType === 'numeric') return Hash
  if (semanticType === 'boolean') return Binary
  if (semanticType === 'temporal') return CalendarDays
  return Type
}

export function QueryResultProfilePanel({
  columns,
  rows,
}: QueryResultProfilePanelProps) {
  const profile = useMemo(
    () => buildResultProfile({ columns, rows }),
    [columns, rows],
  )
  const overviewRows = useMemo(() => buildOverviewRows(profile), [profile])

  if (rows.length === 0 || columns.length === 0) {
    return (
      <div className="grid h-full min-h-[180px] place-items-center p-6 text-center">
        <div>
          <p className="font-semibold text-sm">Brak profilu</p>
          <p className="mt-1 max-w-sm text-muted-foreground text-sm leading-6">
            Uruchom zapytanie zwracajace wiersze, zeby zobaczyc profil wynikow.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {overviewRows.map((row) => {
          const TypeIcon = getTypeIcon(row.semanticType)

          return (
            <div
              className="rounded-md border border-border bg-background p-3"
              key={row.name}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sm">{row.name}</p>
                  <div className="mt-1 flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
                    <TypeIcon aria-hidden="true" size={12} />
                    <span className="truncate">{row.typeLabel}</span>
                  </div>
                </div>
                <CompletionDonut
                  nullCount={row.nullCount}
                  percent={row.completenessPercent}
                  rowCount={profile.rowCount}
                />
              </div>

              <div className="mt-3">
                {row.numericStats ? (
                  <div className="grid gap-2">
                    <HistogramMiniChart stats={row.numericStats} />
                    <NumericStatsLine stats={row.numericStats} />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-lg">
                        {row.uniqueCount?.toLocaleString() ?? '-'}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        unique
                      </span>
                    </div>
                    {row.topValues.length > 0 ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.topValues
                          .slice(0, 4)
                          .map((value) => `${value.label} (${value.count})`)
                          .join(', ')}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        No frequent values
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
