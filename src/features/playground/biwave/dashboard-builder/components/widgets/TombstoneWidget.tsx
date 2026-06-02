import { AlertTriangle, Trash2 } from 'lucide-react'
import { useDashboardStore } from '../../chart-engine/store'

interface TombstoneWidgetProps {
  widgetId: string
  reason: 'dataset-removed' | 'schema-mismatch' | 'no-dataset'
  /** Display label — typically the missing dataset id or a column list. */
  detail?: string
}

const HEADLINE: Record<TombstoneWidgetProps['reason'], string> = {
  'dataset-removed': 'Dataset removed',
  'schema-mismatch': 'Columns missing',
  'no-dataset': 'No dataset bound',
}

/**
 * Renders an error-state placeholder for a Widget whose binding has broken
 * (biwave-10, ADR-0005 lifecycle). The layout slot is preserved; the user
 * resolves manually via "Delete" (and later via "Re-bind…" once that UI lands).
 *
 * Calculated fields and filter rules tombstoning is a separate surface and
 * will live in the FilterPanel / FieldList from biwave-09 / future work.
 */
export function TombstoneWidget({
  widgetId,
  reason,
  detail,
}: TombstoneWidgetProps) {
  const { removeWidget } = useDashboardStore()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-destructive/5 p-4 text-center">
      <AlertTriangle className="h-5 w-5 text-destructive/70" />
      <div className="space-y-0.5">
        <p className="text-destructive text-xs font-medium">
          {HEADLINE[reason]}
        </p>
        {detail ? (
          <p
            className="break-all text-[10px] text-muted-foreground"
            title={detail}
          >
            {detail}
          </p>
        ) : null}
      </div>
      <button
        className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => removeWidget(widgetId)}
        type="button"
      >
        <Trash2 className="h-3 w-3" />
        Delete widget
      </button>
    </div>
  )
}
