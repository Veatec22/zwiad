import { Binary, CalendarDays, Columns3, Hash, Rows3, Type } from 'lucide-react'

import type { SailorProfileSummary } from './profileRows'

const cards = [
  { key: 'rows', label: 'Rows', Icon: Rows3 },
  { key: 'columns', label: 'Columns', Icon: Columns3 },
  { key: 'numeric', label: 'Numeric', Icon: Hash },
  { key: 'text', label: 'Text', Icon: Type },
  { key: 'boolean', label: 'Boolean', Icon: Binary },
  { key: 'temporal', label: 'Date', Icon: CalendarDays },
] as const

export function ProfileSummaryChips({
  summary,
}: {
  summary: SailorProfileSummary
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map(({ key, label, Icon }) => (
        <div
          className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2"
          key={key}
        >
          <Icon
            aria-hidden="true"
            className="text-muted-foreground"
            size={14}
          />
          <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
            {label}
          </span>
          <span className="font-semibold text-sm">
            {summary[key].toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}
