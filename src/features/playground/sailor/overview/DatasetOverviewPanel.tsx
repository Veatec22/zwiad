import {
  Binary,
  CalendarDays,
  Check,
  Hash,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { SailorDataset } from '../sailorTypes'
import { CorrelationMatrixPanel } from './CorrelationMatrixPanel'
import {
  CompletionDonut,
  HistogramMiniChart,
  NumericStatsLine,
} from './ProfileMiniCharts'
import { ProfileSummaryChips } from './ProfileSummaryChips'
import { buildOverviewRows, getProfileSummary } from './profileRows'

interface DatasetListItem {
  id: string
  fileName: string
  displayName: string
}

interface DatasetOverviewPanelProps {
  activeDataset: SailorDataset | null
  datasets: DatasetListItem[]
  activeDatasetId: string | null
  isLoadingDataset: boolean
  onUploadClick: () => void
  onSelectDataset: (id: string) => void
  onRenameDataset: (id: string, displayName: string) => void
  onRemoveDataset: (id: string) => void
}

function sanitizeIdent(value: string) {
  let cleaned = value.replace(/[^A-Za-z0-9_]/g, '_').replace(/_+/g, '_')
  cleaned = cleaned.replace(/^_+|_+$/g, '')
  if (!cleaned) return ''
  if (/^[0-9]/.test(cleaned)) cleaned = `t_${cleaned}`
  return cleaned
}

function getTypeIcon(
  semanticType: SailorDataset['profile']['columns'][number]['semanticType'],
) {
  if (semanticType === 'numeric') return Hash
  if (semanticType === 'boolean') return Binary
  if (semanticType === 'temporal') return CalendarDays
  return Type
}

function DatasetListRow({
  dataset,
  isActive,
  onSelect,
  onRename,
  onRemove,
  takenNames,
}: {
  dataset: DatasetListItem
  isActive: boolean
  onSelect: () => void
  onRename: (next: string) => void
  onRemove: () => void
  takenNames: string[]
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(dataset.displayName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the controlled draft to the latest name when not actively editing
    if (!isEditing) setDraft(dataset.displayName)
  }, [dataset.displayName, isEditing])

  const sanitized = sanitizeIdent(draft)
  const isCollision = takenNames.includes(sanitized)
  const isInvalid = !sanitized || isCollision

  const commit = () => {
    if (isInvalid) {
      setDraft(dataset.displayName)
      setIsEditing(false)
      return
    }
    onRename(sanitized)
    setIsEditing(false)
  }

  const cancel = () => {
    setDraft(dataset.displayName)
    setIsEditing(false)
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs transition ${
        isActive
          ? 'border-foreground bg-background'
          : 'border-border bg-background/40 hover:bg-background'
      }`}
    >
      {isEditing ? (
        <>
          <input
            className={`h-6 min-w-0 flex-1 rounded border bg-background px-1.5 font-mono text-xs outline-none focus:ring-2 focus:ring-ring ${
              isInvalid ? 'border-destructive' : 'border-border'
            }`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancel()
              }
            }}
            ref={inputRef}
            value={draft}
          />
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            disabled={isInvalid}
            onClick={commit}
            type="button"
          >
            <Check size={12} />
          </button>
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={cancel}
            type="button"
          >
            <X size={12} />
          </button>
        </>
      ) : (
        <>
          <button
            className="flex min-w-0 flex-1 flex-col items-start text-left"
            onClick={onSelect}
            type="button"
          >
            <span className="w-full truncate font-mono font-semibold text-xs">
              {dataset.displayName}
            </span>
            <span className="w-full truncate text-[10px] text-muted-foreground">
              {dataset.fileName}
            </span>
          </button>
          <button
            className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            title="Rename"
            type="button"
          >
            <Pencil size={12} />
          </button>
          <button
            className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-destructive group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Remove"
            type="button"
          >
            <Trash2 size={12} />
          </button>
        </>
      )}
    </div>
  )
}

export function DatasetOverviewPanel({
  activeDataset,
  datasets,
  activeDatasetId,
  isLoadingDataset,
  onUploadClick,
  onSelectDataset,
  onRenameDataset,
  onRemoveDataset,
}: DatasetOverviewPanelProps) {
  const { t } = useTranslation()
  const summary = useMemo(
    () => (activeDataset ? getProfileSummary(activeDataset.profile) : null),
    [activeDataset],
  )
  const overviewRows = useMemo(
    () => (activeDataset ? buildOverviewRows(activeDataset.profile) : []),
    [activeDataset],
  )

  const hasDatasets = datasets.length > 0
  const uploadLabel = hasDatasets
    ? t('sailor.addDataset')
    : t('sailor.uploadCsv')

  return (
    <aside className="flex min-h-0 flex-col border-border border-r bg-muted/20">
      <div className="border-border border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">DATA</p>
          <Button
            disabled={isLoadingDataset}
            onClick={onUploadClick}
            size="sm"
            type="button"
            variant="outline"
          >
            {isLoadingDataset ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : hasDatasets ? (
              <Plus aria-hidden="true" size={16} />
            ) : (
              <Upload aria-hidden="true" size={16} />
            )}
            {uploadLabel}
          </Button>
        </div>

        {hasDatasets ? (
          <div className="mt-3 grid gap-1.5">
            {datasets.map((dataset) => (
              <DatasetListRow
                dataset={dataset}
                isActive={dataset.id === activeDatasetId}
                key={dataset.id}
                onRemove={() => onRemoveDataset(dataset.id)}
                onRename={(next) => onRenameDataset(dataset.id, next)}
                onSelect={() => onSelectDataset(dataset.id)}
                takenNames={datasets
                  .filter((d) => d.id !== dataset.id)
                  .map((d) => d.displayName)}
              />
            ))}
          </div>
        ) : null}

        {summary ? (
          <div className="mt-4">
            <ProfileSummaryChips summary={summary} />
          </div>
        ) : null}
      </div>

      {activeDataset ? (
        <Tabs className="min-h-0 flex-1 gap-0" defaultValue="schema">
          <div className="border-border border-b p-3">
            <TabsList className="grid h-9 w-full grid-cols-2">
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="correlation">Correlation</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="min-h-0 overflow-auto p-3" value="schema">
            <div className="grid gap-2">
              {overviewRows.map((row) => (
                <div
                  className="rounded-md border border-border bg-background p-3"
                  key={row.name}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm">
                        {row.name}
                      </p>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
                        {(() => {
                          const TypeIcon = getTypeIcon(row.semanticType)
                          return <TypeIcon aria-hidden="true" size={12} />
                        })()}
                        <span className="truncate">{row.typeLabel}</span>
                      </div>
                    </div>
                    <CompletionDonut
                      nullCount={row.nullCount}
                      percent={row.completenessPercent}
                      rowCount={activeDataset.profile.rowCount}
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
              ))}
            </div>
          </TabsContent>

          <TabsContent
            className="min-h-0 overflow-auto p-3"
            value="correlation"
          >
            <CorrelationMatrixPanel
              correlation={activeDataset.profile.correlation}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </aside>
  )
}
