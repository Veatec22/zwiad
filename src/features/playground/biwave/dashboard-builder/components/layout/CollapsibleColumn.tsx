import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type ReactNode } from 'react'

interface CollapsibleColumnProps {
  title: string
  /** Width of the column when expanded (CSS length). */
  width: string
  collapsed: boolean
  onToggle: () => void
  /**
   * `edge` controls which way the toggle chevron points.
   * `right` → ChevronLeft when collapsed (points "expand-inward").
   * `left` / `middle` → ChevronRight when collapsed.
   */
  edge?: 'left' | 'right' | 'middle'
  children: ReactNode
}

/**
 * PowerBI-style collapsible aside column (biwave-09).
 *
 * Animated width transition: same DOM root in both states so CSS can
 * transition between collapsed (`32px`) and expanded (`width`).
 * Inner content swaps instantly — header bar in expanded, vertical title
 * strip in collapsed.
 */
export function CollapsibleColumn({
  title,
  width,
  collapsed,
  onToggle,
  edge = 'middle',
  children,
}: CollapsibleColumnProps) {
  const CollapsedIcon = edge === 'right' ? ChevronLeft : ChevronRight
  const ExpandedIcon = edge === 'right' ? ChevronRight : ChevronLeft

  return (
    <div
      className="flex h-full flex-col overflow-hidden border-border border-r bg-background transition-[width] duration-200 ease-out"
      style={{ width: collapsed ? '32px' : width }}
    >
      {collapsed ? (
        <>
          <button
            aria-label={`Expand ${title}`}
            className="flex h-7 w-full shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onToggle}
            title={`Expand ${title}`}
            type="button"
          >
            <CollapsedIcon className="h-3.5 w-3.5" />
          </button>
          <div className="flex flex-1 items-center justify-center bg-muted/30">
            <div
              className="select-none text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              {title}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex h-7 shrink-0 items-center justify-between border-border border-b bg-muted/30 px-2">
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
            <button
              aria-label={`Collapse ${title}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
              onClick={onToggle}
              title={`Collapse ${title}`}
              type="button"
            >
              <ExpandedIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </>
      )}
    </div>
  )
}
