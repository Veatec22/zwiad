import type * as duckdb from '@duckdb/duckdb-wasm'
import { ChevronDown, FileUp, Loader2, Plus, Trash2, Type } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Icons } from '@/config/icons'
import {
  createDuckDBConnection,
  queryToRows,
  registerCsvTable,
  sqlIdent,
} from '@/features/playground/_shared/duckdb'

import {
  buildCalculatedViewSql,
  validateCalculatedField,
} from './chart-engine/calculatedFields'
import {
  type ChartType,
  canRenderChart,
  chartConfigs,
  getChartConfig,
  getDefaultChannelState,
  getDefaultStyleState,
} from './chart-engine/configs'
import type { EncodedFieldValue } from './chart-engine/configs/types'
import { fieldsFromDescribeRows } from './chart-engine/duckdbSchema'
import {
  buildChartQuery,
  transformChartData,
} from './chart-engine/sql/chartQueryBuilder'
import {
  datasetActiveTable,
  datasetSourceTable,
  selectActiveDataset,
  selectSelectedWidget,
  slugifyDatasetName,
  useDashboardStore,
  type CalculatedField,
  type Dataset,
  type Widget,
  type WidgetChannels,
} from './chart-engine/store'
import type { DatasetField, FilterRule } from './chart-engine/types'
import { CATEGORICAL_PALETTES } from './components/ColorPicker'
import { ChartView } from './components/chart/ChartView'
import { ConfigPanel } from './components/config/ConfigPanel'
import { FieldList } from './components/fields/FieldList'
import { CollapsibleColumn } from './components/layout/CollapsibleColumn'
import { ReportCanvas } from './components/layout/ReportCanvas'
import { TabBar } from './components/layout/TabBar'
import { FilterPanel } from './components/filters/FilterPanel'
import { TextWidget } from './components/widgets/TextWidget'
import { TombstoneWidget } from './components/widgets/TombstoneWidget'

const MAX_CSV_BYTES = 25 * 1024 * 1024

/** Stable empty-array reference for selectors that may return no filters. */
const EMPTY_FILTERS: FilterRule[] = []

/**
 * Module-level DuckDB runtime singleton. The Zustand store survives modal
 * close/reopen (per ADR-0004), so DuckDB must too — keeping the runtime in a
 * component-scoped `useRef` would re-init on every reopen and orphan all
 * registered tables.
 *
 * The runtime lives until a real page reload (the only honest wipe point).
 */
let sharedRuntime: DuckDBRuntime | null = null
/**
 * Per-dataset cleanup callbacks returned by `registerCsvTable`. Keyed by
 * dataset id; same lifetime as `sharedRuntime`.
 */
const sharedCleanups = new Map<string, () => Promise<void>>()

interface DuckDBRuntime {
  db: duckdb.AsyncDuckDB
  conn: duckdb.AsyncDuckDBConnection
}

interface WidgetRendererProps {
  widget: Widget
  query: (sql: string) => Promise<Array<Record<string, unknown>>>
  tableName: string
  globalFilters: FilterRule[]
  fields: DatasetField[]
  disabled?: boolean
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Always pass a fresh ArrayBuffer view to satisfy SubtleCrypto BufferSource.
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function withOpacity(color: string, opacity: number): string {
  const clamped = Math.min(1, Math.max(0, opacity))
  if (clamped >= 1) return color

  const hex = color.trim()
  const shortHexMatch = /^#([0-9a-f]{3})$/i.exec(hex)
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1]
      .split('')
      .map((value) => Number.parseInt(value + value, 16))
    return `rgba(${r}, ${g}, ${b}, ${clamped})`
  }

  const longHexMatch = /^#([0-9a-f]{6})$/i.exec(hex)
  if (longHexMatch) {
    const value = longHexMatch[1]
    const r = Number.parseInt(value.slice(0, 2), 16)
    const g = Number.parseInt(value.slice(2, 4), 16)
    const b = Number.parseInt(value.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${clamped})`
  }

  return color
}

function WidgetRenderer({
  disabled: _disabled,
  fields: _fields,
  globalFilters,
  query,
  tableName,
  widget,
}: WidgetRendererProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Array<Record<string, unknown>> | null>(null)

  const chartType = widget.chartType
  const canRender = useMemo(() => {
    if (!chartType) return false
    return canRenderChart(chartType, widget.channels)
  }, [chartType, widget.channels])

  const queryResult = useMemo(() => {
    if (!canRender || !chartType) return null
    if (!tableName) return null
    // Filter composition is handled by the caller (renderWidget) since
    // biwave-07; the WidgetRenderer is now dataset-agnostic and just
    // receives the already-merged `globalFilters` list.
    return buildChartQuery(chartType, {
      channels: widget.channels,
      globalFilters,
      localFilters: [],
      tableName,
    })
  }, [canRender, chartType, globalFilters, tableName, widget.channels])

  useEffect(() => {
    const sql = queryResult?.sql
    if (!sql) {
      return
    }

    let cancelled = false

    const executeQuery = async () => {
      setIsLoading(true)
      setError(null)
      setRows(null)

      try {
        const resultRows = await query(sql)
        if (!cancelled) setRows(resultRows)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('query.error', 'Query failed'),
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void executeQuery()

    return () => {
      cancelled = true
    }
  }, [queryResult?.sql, query, t])

  const chartOptions = useMemo<Record<string, unknown> | null>(() => {
    if (!rows || !chartType) return null

    const effectiveStyles = {
      ...getDefaultStyleState(chartType),
      ...widget.styles,
    }

    const transformed = transformChartData(
      chartType,
      rows,
      widget.channels,
      effectiveStyles,
    )

    const paletteName = effectiveStyles.paletteName as
      | keyof typeof CATEGORICAL_PALETTES
      | undefined
    const palette = paletteName ? CATEGORICAL_PALETTES[paletteName] : undefined

    const showLegend = (effectiveStyles.showLegend as boolean) ?? true
    const legendFontSize = (effectiveStyles.legendFontSize as number) ?? 12
    const legendBold = (effectiveStyles.legendBold as boolean) ?? false
    const legendItalic = (effectiveStyles.legendItalic as boolean) ?? false
    const legendUnderline =
      (effectiveStyles.legendUnderline as boolean) ?? false
    const legendColor =
      (effectiveStyles.legendColor as string) ?? 'hsl(var(--foreground))'
    const legendAlign = (effectiveStyles.legendAlign as string) ?? 'center'
    const showTooltip = (effectiveStyles.showTooltip as boolean) ?? true
    const tooltipFontSize = (effectiveStyles.tooltipFontSize as number) ?? 12
    const tooltipBorderWidth =
      (effectiveStyles.tooltipBorderWidth as number) ?? 1
    const tooltipBorderColor =
      (effectiveStyles.tooltipBorderColor as string) ?? 'hsl(var(--border))'
    const tooltipBackgroundColor =
      (effectiveStyles.tooltipBackgroundColor as string) ??
      'hsl(var(--popover))'
    const tooltipBackgroundOpacity = Number(
      effectiveStyles.tooltipBackgroundOpacity ?? 1,
    )
    const tooltipTextColor =
      (effectiveStyles.tooltipTextColor as string) ??
      'hsl(var(--secondary-foreground))'

    const options: Record<string, unknown> = {
      grid: {
        bottom: showLegend ? 44 : 20,
        containLabel: true,
        left: 20,
        right: 20,
        top: 16,
      },
      legend: {
        bottom: 0,
        left:
          legendAlign === 'right'
            ? 'right'
            : legendAlign === 'left'
              ? 0
              : 'center',
        selectedMode: false,
        show: showLegend,
        textStyle: {
          color: legendColor,
          fontFamily: 'inherit',
          fontSize: legendFontSize,
          fontStyle: legendItalic ? 'italic' : 'normal',
          fontWeight: legendBold ? 'bold' : 'normal',
          textDecoration: legendUnderline ? 'underline' : 'none',
        },
      },
      textStyle: { fontFamily: 'inherit' },
      tooltip: {
        backgroundColor: withOpacity(
          tooltipBackgroundColor,
          tooltipBackgroundOpacity,
        ),
        borderColor: tooltipBorderColor,
        borderWidth: tooltipBorderWidth,
        show: showTooltip,
        textStyle: {
          color: tooltipTextColor,
          fontFamily: 'inherit',
          fontSize: tooltipFontSize,
        },
        trigger: chartType === 'scatter' ? 'item' : 'axis',
      },
    }

    if (transformed.xAxis) options.xAxis = transformed.xAxis
    if (transformed.yAxis) options.yAxis = transformed.yAxis
    if (transformed.series) options.series = transformed.series
    if (transformed.options) Object.assign(options, transformed.options)
    if (palette) options.color = palette

    if (
      ['pie', 'sankey', 'treemap', 'gauge', 'calendar', 'radar'].includes(
        chartType,
      )
    ) {
      delete options.xAxis
      delete options.yAxis
      delete options.grid
      options.tooltip = {
        ...(options.tooltip as Record<string, unknown>),
        trigger: 'item',
      }
    }

    if (
      chartType === 'sankey' ||
      chartType === 'treemap' ||
      chartType === 'gauge'
    ) {
      options.legend = { show: false }
    }

    return options
  }, [rows, chartType, widget.channels, widget.styles])

  if (widget.type === 'text') {
    return <TextWidget text={String(widget.styles.text ?? '')} />
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
        <p className="text-center text-destructive text-sm">{error}</p>
      </div>
    )
  }

  if (!canRender) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-muted-foreground text-xs">
          {t(
            'widget.configure',
            'Drag or double-click fields to configure this chart',
          )}
        </p>
      </div>
    )
  }

  if (!chartOptions || !chartType) {
    return null
  }

  return <ChartView options={chartOptions} type={chartType} />
}

function createChartWidget(
  chartType: ChartType,
  datasetId: string,
): Omit<Widget, 'id'> {
  const config = chartConfigs[chartType]
  const channels = getDefaultChannelState(chartType) as WidgetChannels

  return {
    channels,
    chartType,
    datasetId,
    filters: [],
    layout: { h: 4, minH: 2, minW: 2, w: 6, x: 0, y: 0 },
    styles: getDefaultStyleState(chartType),
    title: config.nameKey.split('.').at(1) ?? chartType,
    type: 'chart',
  }
}

export function DashboardBuilderCard() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const [canvasWidth, setCanvasWidth] = useState(1120)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const selectedWidget = useDashboardStore(selectSelectedWidget)
  const datasets = useDashboardStore((state) => state.datasets)
  const activeDataset = useDashboardStore(selectActiveDataset)
  const dashboardFilters = useDashboardStore((state) => state.dashboardFilters)
  const activeTabId = useDashboardStore((state) => state.activeTabId)
  const tabs = useDashboardStore((state) => state.tabs)
  const activeTabFilters = useMemo<FilterRule[]>(() => {
    const tab = tabs.find((t) => t.id === activeTabId)
    return tab?.filters ?? EMPTY_FILTERS
  }, [tabs, activeTabId])
  const {
    addCalculatedField,
    addDataset,
    addToChannel,
    addWidget,
    clearDashboardFilters,
    redo,
    redoStack,
    removeCalculatedField,
    removeDataset,
    setActiveDataset,
    setChannel,
    undo,
    undoStack,
    updateCalculatedField,
    updateDatasetFields,
  } = useDashboardStore()

  const { t } = useTranslation()
  const canUndo = undoStack.length > 0 && !isLoading
  const canRedo = redoStack.length > 0 && !isLoading

  // Fields visible in the right panel come from the active dataset.
  const fields = activeDataset?.fields ?? []
  const calculatedFields = activeDataset?.calculatedFields ?? []
  const activeDatasetId = activeDataset?.id ?? null

  useEffect(() => {
    const element = canvasRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      setCanvasWidth(Math.max(680, Math.floor(entry.contentRect.width)))
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  /**
   * Rebuild a Dataset's `dataset_<id>_active` view to layer its calculated
   * fields on top of the raw source table. Returns the post-rebuild field
   * schema and also writes it back into the store.
   */
  const refreshActiveView = useCallback(
    async (
      datasetId: string,
      nextCalculatedFields: CalculatedField[],
    ): Promise<DatasetField[]> => {
      const runtime = sharedRuntime
      if (!runtime) return []

      const sourceTable = datasetSourceTable(datasetId)
      const activeTable = datasetActiveTable(datasetId)

      await runtime.conn.query(
        buildCalculatedViewSql({
          baseTableName: sourceTable,
          calculatedFields: nextCalculatedFields,
          viewName: activeTable,
        }),
      )

      const describeRows = await queryToRows(
        runtime.conn,
        `DESCRIBE ${sqlIdent(activeTable)}`,
      )
      const nextFields = fieldsFromDescribeRows(describeRows)
      updateDatasetFields(datasetId, nextFields)
      return nextFields
    },
    [updateDatasetFields],
  )

  const loadBytes = useCallback(
    async ({ bytes, name }: { bytes: Uint8Array; name: string }) => {
      if (bytes.byteLength > MAX_CSV_BYTES) {
        setError('CSV is above the 25 MB browser POC limit.')
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        if (!sharedRuntime) {
          sharedRuntime = await createDuckDBConnection()
        }

        // Pick a dataset id up front so the DuckDB table name matches the
        // store id exactly (slugify here, store derives its own otherwise).
        const baseSlug = slugifyDatasetName(name)
        let datasetId = baseSlug
        let suffix = 2
        while (datasets.some((d) => d.id === datasetId)) {
          datasetId = `${baseSlug}_${suffix}`
          suffix += 1
        }

        const sourceTable = datasetSourceTable(datasetId)

        // Drop any prior cleanup with the same slug (defensive — should not
        // happen given the suffix logic above).
        const prevCleanup = sharedCleanups.get(datasetId)
        if (prevCleanup) {
          await prevCleanup()
          sharedCleanups.delete(datasetId)
        }

        const registered = await registerCsvTable({
          bytes,
          conn: sharedRuntime.conn,
          db: sharedRuntime.db,
          fileName: name,
          tableName: sourceTable,
        })
        sharedCleanups.set(datasetId, registered.cleanup)

        const csvHash = await sha256Hex(bytes)
        const rowCountRows = await queryToRows(
          sharedRuntime.conn,
          `SELECT COUNT(*)::BIGINT AS n FROM ${sqlIdent(sourceTable)}`,
        )
        const rowCount = Number(
          (rowCountRows[0] as Record<string, unknown> | undefined)?.n ?? 0,
        )

        // Insert dataset into the store with the id we used for DuckDB.
        const datasetName = name.replace(/\.[^.]+$/, '') || name
        addDataset({
          id: datasetId,
          name: datasetName,
          fileName: name,
          csvHash,
          fields: [], // populated below by refreshActiveView
          calculatedFields: [],
          rowCount: Number.isFinite(rowCount) ? rowCount : 0,
        })

        // Build the active view (no calc fields yet) and pull the schema.
        await refreshActiveView(datasetId, [])

        // Make the freshly-uploaded dataset active so the right panel shows it.
        setActiveDataset(datasetId)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load CSV.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [addDataset, datasets, refreshActiveView, setActiveDataset],
  )

  const handleFileChange = (file: File | undefined) => {
    if (!file) return
    void file.arrayBuffer().then((buffer) =>
      loadBytes({
        bytes: new Uint8Array(buffer),
        name: file.name,
      }),
    )
  }

  const handleRemoveDataset = useCallback(
    (datasetId: string) => {
      // We intentionally do NOT drop the DuckDB table/view here. Undo must
      // be able to bring the Dataset back without re-uploading the CSV — and
      // we don't keep the bytes around. The orphan table costs memory until
      // the next page reload (ADR-0004 "refresh = wipe" boundary).
      removeDataset(datasetId)
      // Widgets bound to the removed Dataset survive as tombstones (biwave-10).
    },
    [removeDataset],
  )

  const query = useCallback(async (sql: string) => {
    const runtime = sharedRuntime
    if (!runtime) return []
    return queryToRows(runtime.conn, sql)
  }, [])

  const handleAddChart = (chartType: ChartType = 'bar') => {
    if (!activeDatasetId) return
    addWidget(createChartWidget(chartType, activeDatasetId))
  }

  const handleAddText = () => {
    addWidget({
      channels: {},
      datasetId: '', // text widgets do not bind to a dataset
      filters: [],
      layout: { h: 2, minH: 1, minW: 2, w: 6, x: 0, y: 0 },
      styles: { text: t('dashboard.widgetTextDefault') },
      title: t('dashboard.text'),
      type: 'text',
    })
  }

  const handleCreateCalculatedField = async ({
    expression,
    name,
  }: {
    name: string
    expression: string
  }) => {
    if (!activeDatasetId) throw new Error('No active dataset.')
    const validationError = validateCalculatedField({ expression, name })
    if (validationError) throw new Error(validationError)

    const trimmedName = name.trim()
    if (fields.some((field) => field.name === trimmedName)) {
      throw new Error('Field already exists.')
    }

    const field: CalculatedField = {
      expression: expression.trim(),
      name: trimmedName,
      semanticType: 'quantitative',
    }
    const nextCalculatedFields: CalculatedField[] = [...calculatedFields, field]
    await refreshActiveView(activeDatasetId, nextCalculatedFields)
    addCalculatedField(activeDatasetId, field)
  }

  const handleEditCalculatedField = async (
    currentName: string,
    { expression, name }: { name: string; expression: string },
  ) => {
    if (!activeDatasetId) throw new Error('No active dataset.')
    const validationError = validateCalculatedField({ expression, name })
    if (validationError) throw new Error(validationError)

    const nextCalculatedFields: CalculatedField[] = calculatedFields.map(
      (field) =>
        field.name === currentName
          ? { ...field, expression: expression.trim(), name: name.trim() }
          : field,
    )
    await refreshActiveView(activeDatasetId, nextCalculatedFields)
    updateCalculatedField(activeDatasetId, currentName, {
      expression: expression.trim(),
      name: name.trim(),
    })
  }

  const handleDeleteCalculatedField = (name: string) => {
    if (!activeDatasetId) return
    const nextCalculatedFields: CalculatedField[] = calculatedFields.filter(
      (field) => field.name !== name,
    )
    const datasetId = activeDatasetId
    void refreshActiveView(datasetId, nextCalculatedFields).then(() =>
      removeCalculatedField(datasetId, name),
    )
  }

  const handleFieldDoubleClick = useCallback(
    (field: DatasetField) => {
      if (!selectedWidget?.chartType) return

      const chartConfig = getChartConfig(selectedWidget.chartType)
      const wantsMeasure = field.semanticType === 'quantitative'
      const matchingChannels = [...chartConfig.channels]
        .filter((channel) => {
          if (channel.accepts === 'any') return true
          return wantsMeasure
            ? channel.accepts === 'measure'
            : channel.accepts === 'dimension'
        })
        .sort((first, second) => first.order - second.order)
      const targetChannel =
        matchingChannels.find(
          (channel) => (selectedWidget.channels[channel.id] ?? []).length === 0,
        ) ??
        matchingChannels[0] ??
        null

      if (!targetChannel) return

      const encoded: EncodedFieldValue = {
        aggregation: wantsMeasure
          ? (targetChannel.defaultAggregation ?? 'sum')
          : undefined,
        name: field.name,
        semanticType: field.semanticType,
      }

      if (targetChannel.cardinality === 'single') {
        setChannel(selectedWidget.id, targetChannel.id, [encoded])
      } else {
        addToChannel(selectedWidget.id, targetChannel.id, encoded)
      }
    },
    [addToChannel, selectedWidget, setChannel],
  )

  const datasetById = useMemo(() => {
    const map = new Map<string, Dataset>()
    for (const d of datasets) map.set(d.id, d)
    return map
  }, [datasets])

  const renderWidget = useCallback(
    (widget: Widget) => {
      if (widget.type === 'chart') {
        const dataset = datasetById.get(widget.datasetId)
        if (!dataset) {
          return (
            <TombstoneWidget
              widgetId={widget.id}
              reason={widget.datasetId ? 'dataset-removed' : 'no-dataset'}
              detail={widget.datasetId || undefined}
            />
          )
        }

        // Check schema: every column referenced by channels/filters must exist.
        const knownColumns = new Set(dataset.fields.map((f) => f.name))
        const referenced = new Set<string>()
        for (const fields of Object.values(widget.channels)) {
          for (const encoded of fields) referenced.add(encoded.name)
        }
        for (const rule of widget.filters) {
          if (rule.fieldName) referenced.add(rule.fieldName)
        }
        const missing = [...referenced].filter((n) => !knownColumns.has(n))
        if (missing.length > 0) {
          return (
            <TombstoneWidget
              widgetId={widget.id}
              reason="schema-mismatch"
              detail={`missing: ${missing.join(', ')}`}
            />
          )
        }

        // Effective filter set for this widget (biwave-07):
        // union of widget / tab / dashboard rules, matched by datasetId.
        // Legacy rules without `datasetId` apply to every dataset
        // (back-compat for any pre-biwave-07 stored config).
        const matches = (rule: FilterRule): boolean =>
          rule.enabled &&
          (rule.datasetId === undefined ||
            rule.datasetId === '' ||
            rule.datasetId === widget.datasetId)
        const effective = [
          ...widget.filters.filter(matches),
          ...activeTabFilters.filter(matches),
          ...dashboardFilters.filter(matches),
        ]

        return (
          <WidgetRenderer
            disabled={isLoading}
            fields={dataset.fields}
            globalFilters={effective}
            query={query}
            tableName={datasetActiveTable(dataset.id)}
            widget={widget}
          />
        )
      }
      return (
        <WidgetRenderer
          disabled={isLoading}
          fields={[]}
          globalFilters={[]}
          query={query}
          tableName=""
          widget={widget}
        />
      )
    },
    [activeTabFilters, dashboardFilters, datasetById, isLoading, query],
  )

  // Reset dashboard-level filters when all datasets are gone (defensive — UX
  // surfaces will eventually scope filters per-Dataset in biwave-07).
  useEffect(() => {
    if (datasets.length === 0 && dashboardFilters.length > 0) {
      clearDashboardFilters()
    }
  }, [datasets.length, dashboardFilters.length, clearDashboardFilters])

  const hasDatasets = datasets.length > 0

  // Per-column collapse state for the aside (biwave-09).
  const [configCollapsed, setConfigCollapsed] = useState(false)
  const [dataCollapsed, setDataCollapsed] = useState(false)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <div className="flex items-center gap-2 border-border border-b bg-background px-3 py-2">
          <input
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
            ref={fileInputRef}
            type="file"
          />
          <div className="flex items-center gap-1 border-border border-r pr-2">
            <Button
              aria-label="Undo"
              disabled={!canUndo}
              onClick={undo}
              size="icon"
              title="Undo"
              type="button"
              variant="ghost"
            >
              <Icons.undo className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Redo"
              disabled={!canRedo}
              onClick={redo}
              size="icon"
              title="Redo"
              type="button"
              variant="ghost"
            >
              <Icons.redo className="h-4 w-4" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={!hasDatasets} size="sm" type="button">
                <Plus className="h-4 w-4" />
                {t('dashboard.addElement')}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {Object.entries(chartConfigs).map(([type, config]) => {
                const Icon = config.icon
                return (
                  <DropdownMenuItem
                    className="text-xs"
                    key={type}
                    onClick={() => handleAddChart(type as ChartType)}
                  >
                    <Icon className="mr-2 h-3.5 w-3.5" />
                    {type}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuItem className="text-xs" onClick={handleAddText}>
                <Type className="mr-2 h-3.5 w-3.5" />
                {t('dashboard.text')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TabBar />
            <div
              ref={canvasRef}
              className="min-w-0 flex-1 overflow-auto bg-muted/35 p-4"
            >
              <div className="h-full min-h-[620px] rounded-lg border border-border bg-background">
                <ReportCanvas renderWidget={renderWidget} width={canvasWidth} />
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 overflow-hidden border-border border-l bg-background">
            <CollapsibleColumn
              title="Settings"
              width="220px"
              collapsed={configCollapsed}
              onToggle={() => setConfigCollapsed((v) => !v)}
              edge="right"
            >
              <ConfigPanel fields={fields} disabled={isLoading} />
            </CollapsibleColumn>

            <CollapsibleColumn
              title="Data"
              width="200px"
              collapsed={dataCollapsed}
              onToggle={() => setDataCollapsed((v) => !v)}
              edge="right"
            >
              <div className="flex h-full flex-col">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-border border-b px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold">{t('dashboard.data')}</div>
                    {error ? (
                      <div
                        className="truncate font-normal text-[10px] text-destructive"
                        title={error}
                      >
                        {error}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    disabled={isLoading}
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileUp className="h-3.5 w-3.5" />
                    )}
                    {t('dashboard.csv')}
                  </Button>
                </div>
                {hasDatasets ? (
                  <div className="border-border border-b">
                    <ul className="max-h-32 overflow-auto py-1">
                      {datasets.map((dataset) => {
                        const isActive = dataset.id === activeDatasetId
                        return (
                          <li
                            key={dataset.id}
                            className={`group flex items-center gap-1 px-2 py-1 text-[11px] ${
                              isActive
                                ? 'bg-muted/50 text-foreground'
                                : 'text-muted-foreground hover:bg-muted/30'
                            }`}
                          >
                            <button
                              className="min-w-0 flex-1 truncate text-left"
                              onClick={() => setActiveDataset(dataset.id)}
                              title={`${dataset.name} · ${dataset.rowCount} rows`}
                              type="button"
                            >
                              {dataset.name}
                            </button>
                            <button
                              aria-label={`Remove ${dataset.name}`}
                              className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                              onClick={() => handleRemoveDataset(dataset.id)}
                              title="Remove dataset"
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 p-2">
                  <FieldList
                    calculatedFields={calculatedFields}
                    datasetName={activeDataset?.name}
                    disabled={isLoading || !activeDatasetId}
                    fields={fields}
                    onCreateCalculatedField={handleCreateCalculatedField}
                    onDeleteCalculatedField={handleDeleteCalculatedField}
                    onEditCalculatedField={handleEditCalculatedField}
                    onFieldDoubleClick={handleFieldDoubleClick}
                  />
                </div>
              </div>
            </CollapsibleColumn>

            <CollapsibleColumn
              title="Filters"
              width="260px"
              collapsed={filtersCollapsed}
              onToggle={() => setFiltersCollapsed((v) => !v)}
              edge="right"
            >
              <FilterPanel
                disabled={isLoading}
                query={query}
                datasetActiveTable={datasetActiveTable}
              />
            </CollapsibleColumn>
          </aside>
        </div>
      </div>
    </TooltipProvider>
  )
}
