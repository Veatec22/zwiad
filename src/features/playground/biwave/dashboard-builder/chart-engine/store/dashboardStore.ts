import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ChartType } from '../configs'
import type { EncodedFieldValue } from '../configs/types'
import type { DatasetField, FilterRule, SemanticType } from '../types'
import type { DashboardConfig, DashboardTabConfig } from './dashboardConfig'

// Dataset model (see ADR-0005 — multi-CSV, no JOIN)

export interface CalculatedField {
  name: string
  expression: string
  semanticType: SemanticType
}

export interface Dataset {
  /** Slug, also used in DuckDB table names: dataset_<id> and dataset_<id>_active */
  id: string
  /** User-visible label, defaults to file name without extension */
  name: string
  /** Original upload filename */
  fileName: string
  /** sha256 hex of the CSV bytes — survives Bundle export/import */
  csvHash: string
  /** Field schema derived from DESCRIBE on the active view */
  fields: DatasetField[]
  /** Per-Dataset calculated fields (biwave-06) */
  calculatedFields: CalculatedField[]
  rowCount: number
}

// Widget Types

export interface WidgetLayout {
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

export interface WidgetChannels {
  [channelId: string]: EncodedFieldValue[]
}

export interface WidgetStyles {
  [styleId: string]: unknown
}

export interface Widget {
  id: string
  type: 'chart' | 'text' // Extensible
  /**
   * Required for chart widgets. Text widgets accept the empty string as a
   * sentinel — they do not query data, so the dataset binding is unused.
   */
  datasetId: string
  chartType?: ChartType
  title: string
  layout: WidgetLayout
  channels: WidgetChannels
  styles: WidgetStyles
  filters: FilterRule[] // Widget-local filters
}

// Dashboard State

interface DashboardState {
  // Metadata
  id: string | null
  name: string

  // Datasets (multi-CSV, no JOIN — see ADR-0005)
  datasets: Dataset[]
  activeDatasetId: string | null

  // Tabs
  tabs: DashboardTabConfig[]
  activeTabId: string | null

  // Widgets — mirrors active tab's widgets for ergonomic selectors
  widgets: Widget[]
  selectedWidgetId: string | null

  /**
   * Dashboard-scope filters. Will gain `datasetId` semantics in biwave-07.
   * Until then these are dataset-agnostic and AND-composed into every widget
   * query (legacy behaviour preserved for compatibility with the live
   * `WidgetRenderer`).
   */
  dashboardFilters: FilterRule[]

  // Data refresh (non-persistent)
  datasetRefreshSeq: number

  // History
  undoStack: DashboardSnapshot[]
  redoStack: DashboardSnapshot[]

  // UI State
  isDirty: boolean
}

interface DashboardSnapshot {
  datasets: Dataset[]
  activeDatasetId: string | null
  tabs: DashboardTabConfig[]
  activeTabId: string | null
  widgets: Widget[]
  selectedWidgetId: string | null
  dashboardFilters: FilterRule[]
}

// Actions

interface DashboardActions {
  // Dashboard lifecycle
  initDashboard: (id: string | null, name: string) => void
  loadDashboard: (
    id: string | null,
    name: string,
    config: DashboardConfig,
  ) => void
  setName: (name: string) => void
  reset: () => void

  // Datasets (biwave-05)
  addDataset: (dataset: Omit<Dataset, 'id'> & { id?: string }) => string
  removeDataset: (id: string) => void
  renameDataset: (id: string, name: string) => void
  setActiveDataset: (id: string | null) => void
  updateDatasetFields: (id: string, fields: DatasetField[]) => void
  updateDatasetMeta: (
    id: string,
    meta: Partial<Pick<Dataset, 'csvHash' | 'fileName' | 'rowCount'>>,
  ) => void

  // Calculated fields (per-Dataset, biwave-06)
  addCalculatedField: (datasetId: string, field: CalculatedField) => void
  updateCalculatedField: (
    datasetId: string,
    currentName: string,
    updates: Partial<CalculatedField>,
  ) => void
  removeCalculatedField: (datasetId: string, name: string) => void

  // Tabs
  addTab: () => void
  setActiveTab: (tabId: string) => void
  renameTab: (tabId: string, name: string) => void
  deleteTab: (tabId: string) => void

  // Widget CRUD
  addWidget: (widget: Omit<Widget, 'id'>) => string
  updateWidget: (id: string, updates: Partial<Omit<Widget, 'id'>>) => void
  removeWidget: (id: string) => void
  duplicateWidget: (id: string) => string | null

  // Widget selection
  selectWidget: (id: string | null) => void

  // Widget layout
  updateLayout: (id: string, layout: Partial<WidgetLayout>) => void
  updateLayouts: (layouts: Array<{ id: string; layout: WidgetLayout }>) => void

  // Widget channels
  setChannel: (
    widgetId: string,
    channelId: string,
    fields: EncodedFieldValue[],
  ) => void
  addToChannel: (
    widgetId: string,
    channelId: string,
    field: EncodedFieldValue,
  ) => void
  removeFromChannel: (
    widgetId: string,
    channelId: string,
    fieldName: string,
  ) => void
  clearChannel: (widgetId: string, channelId: string) => void

  // Widget styles
  setStyle: (widgetId: string, styleId: string, value: unknown) => void
  setStyles: (widgetId: string, styles: WidgetStyles) => void

  // Widget chart type
  setWidgetChartType: (widgetId: string, chartType: ChartType) => void

  // Dashboard filters (renamed from globalFilters — biwave-07 added datasetId)
  addDashboardFilter: (filter: Omit<FilterRule, 'id'>) => void
  updateDashboardFilter: (id: string, updates: Partial<FilterRule>) => void
  removeDashboardFilter: (id: string) => void
  clearDashboardFilters: () => void

  // Tab filters (biwave-07). Scope = the named tab.
  addTabFilter: (tabId: string, filter: Omit<FilterRule, 'id'>) => void
  updateTabFilter: (
    tabId: string,
    id: string,
    updates: Partial<FilterRule>,
  ) => void
  removeTabFilter: (tabId: string, id: string) => void

  // History
  undo: () => void
  redo: () => void
  saveSnapshot: () => void

  // Dirty state
  markClean: () => void

  // Data refresh (forces re-register/reload in the builder)
  refreshDataset: () => void
}

type DashboardStore = DashboardState & DashboardActions

// Helpers

const generateId = () =>
  `widget_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
const generateFilterId = () =>
  `filter_${Math.random().toString(36).slice(2, 9)}`
const generateTabId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab_${Math.random().toString(36).slice(2, 10)}`

export const slugifyDatasetName = (raw: string): string => {
  const base = raw
    .toLowerCase()
    .replace(/\.[^.]+$/, '') // drop extension
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base || 'dataset'
}

const generateDatasetId = (existing: Dataset[], baseName: string): string => {
  const base = slugifyDatasetName(baseName)
  if (!existing.some((d) => d.id === base)) return base
  let n = 2
  while (existing.some((d) => d.id === `${base}_${n}`)) n += 1
  return `${base}_${n}`
}

/** DuckDB raw source table for a Dataset. */
export const datasetSourceTable = (datasetId: string): string =>
  `dataset_${datasetId}`

/** DuckDB view that applies calculated fields on top of the source table. */
export const datasetActiveTable = (datasetId: string): string =>
  `dataset_${datasetId}_active`

const createDefaultTab = (): DashboardTabConfig => ({
  id: generateTabId(),
  name: 'Tab 1',
  widgets: [],
})

const getActiveTab = (state: DashboardState): DashboardTabConfig => {
  const activeId = state.activeTabId
  const existing = activeId ? state.tabs.find((t) => t.id === activeId) : null
  if (existing) return existing

  if (state.tabs.length === 0) {
    const tab = createDefaultTab()
    state.tabs = [tab]
    state.activeTabId = tab.id
    return tab
  }

  state.activeTabId = state.tabs[0].id
  return state.tabs[0]
}

const syncActiveWidgets = (state: DashboardState) => {
  const tab = getActiveTab(state)
  state.widgets = tab.widgets
}

const createSnapshot = (state: DashboardState): DashboardSnapshot => ({
  datasets: JSON.parse(JSON.stringify(state.datasets)),
  activeDatasetId: state.activeDatasetId,
  tabs: JSON.parse(JSON.stringify(state.tabs)),
  activeTabId: state.activeTabId,
  widgets: JSON.parse(JSON.stringify(state.widgets)),
  selectedWidgetId: state.selectedWidgetId,
  dashboardFilters: JSON.parse(JSON.stringify(state.dashboardFilters)),
})

const DEFAULT_WIDGET_SIZE: WidgetLayout = {
  x: 0,
  y: 0,
  w: 6,
  h: 4,
  minW: 2,
  minH: 2,
}

const INITIAL_TAB = createDefaultTab()

// Store

export const useDashboardStore = create<DashboardStore>()(
  immer((set, get) => ({
    // Initial state
    id: null,
    name: 'Untitled Dashboard',
    datasets: [],
    activeDatasetId: null,
    tabs: [INITIAL_TAB],
    activeTabId: INITIAL_TAB.id,
    widgets: INITIAL_TAB.widgets,
    selectedWidgetId: null,
    dashboardFilters: [],
    datasetRefreshSeq: 0,
    undoStack: [],
    redoStack: [],
    isDirty: false,

    // === Dashboard lifecycle ===
    initDashboard: (id, name) =>
      set((state) => {
        state.id = id
        state.name = name
        state.datasets = []
        state.activeDatasetId = null
        state.tabs = [createDefaultTab()]
        state.activeTabId = state.tabs[0].id
        state.widgets = state.tabs[0].widgets
        state.selectedWidgetId = null
        state.dashboardFilters = []
        state.datasetRefreshSeq = 0
        state.undoStack = []
        state.redoStack = []
        state.isDirty = false
      }),
    loadDashboard: (id, name, config) =>
      set((state) => {
        state.id = id
        state.name = name
        state.datasets = config.datasets
          ? JSON.parse(JSON.stringify(config.datasets))
          : []
        state.activeDatasetId =
          config.activeDatasetId ?? state.datasets[0]?.id ?? null
        state.tabs = config.tabs.length > 0 ? config.tabs : [createDefaultTab()]
        state.activeTabId =
          config.activeTabId &&
          state.tabs.some((t) => t.id === config.activeTabId)
            ? config.activeTabId
            : state.tabs[0].id

        const activeTab = getActiveTab(state)
        state.widgets = activeTab.widgets
        state.selectedWidgetId = activeTab.widgets[0]?.id ?? null
        state.dashboardFilters = config.dashboardFilters
        state.datasetRefreshSeq = 0
        state.undoStack = []
        state.redoStack = []
        state.isDirty = false
      }),

    setName: (name) =>
      set((state) => {
        state.name = name
        state.isDirty = true
      }),

    reset: () =>
      set((state) => {
        state.id = null
        state.name = 'Untitled Dashboard'
        state.datasets = []
        state.activeDatasetId = null
        state.tabs = [createDefaultTab()]
        state.activeTabId = state.tabs[0].id
        state.widgets = state.tabs[0].widgets
        state.selectedWidgetId = null
        state.dashboardFilters = []
        state.datasetRefreshSeq = 0
        state.undoStack = []
        state.redoStack = []
        state.isDirty = false
      }),

    // === Datasets ===
    addDataset: (incoming) => {
      const { datasets } = get()
      const id =
        incoming.id && !datasets.some((d) => d.id === incoming.id)
          ? incoming.id
          : generateDatasetId(datasets, incoming.name || incoming.fileName)

      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []

        const dataset: Dataset = {
          id,
          name: incoming.name,
          fileName: incoming.fileName,
          csvHash: incoming.csvHash,
          fields: incoming.fields,
          calculatedFields: incoming.calculatedFields ?? [],
          rowCount: incoming.rowCount,
        }
        state.datasets.push(dataset)
        if (!state.activeDatasetId) state.activeDatasetId = id
        state.isDirty = true
      })

      return id
    },

    removeDataset: (datasetId) =>
      set((state) => {
        if (!state.datasets.some((d) => d.id === datasetId)) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.datasets = state.datasets.filter((d) => d.id !== datasetId)
        if (state.activeDatasetId === datasetId) {
          state.activeDatasetId = state.datasets[0]?.id ?? null
        }
        // Widgets bound to the removed Dataset remain in place; biwave-10
        // renders them as tombstones.
        state.isDirty = true
      }),

    renameDataset: (datasetId, name) =>
      set((state) => {
        const dataset = state.datasets.find((d) => d.id === datasetId)
        if (!dataset) return
        const next = name.trim()
        if (!next) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        dataset.name = next
        state.isDirty = true
      }),

    setActiveDataset: (datasetId) =>
      set((state) => {
        if (datasetId === null) {
          state.activeDatasetId = null
          return
        }
        if (state.datasets.some((d) => d.id === datasetId)) {
          state.activeDatasetId = datasetId
        }
      }),

    updateDatasetFields: (datasetId, fields) =>
      set((state) => {
        const dataset = state.datasets.find((d) => d.id === datasetId)
        if (!dataset) return
        dataset.fields = fields
      }),

    updateDatasetMeta: (datasetId, meta) =>
      set((state) => {
        const dataset = state.datasets.find((d) => d.id === datasetId)
        if (!dataset) return
        if (meta.csvHash !== undefined) dataset.csvHash = meta.csvHash
        if (meta.fileName !== undefined) dataset.fileName = meta.fileName
        if (meta.rowCount !== undefined) dataset.rowCount = meta.rowCount
        state.isDirty = true
      }),

    // === Tabs ===
    addTab: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []

        const index = state.tabs.length + 1
        const tab: DashboardTabConfig = {
          id: generateTabId(),
          name: `Tab ${index}`,
          widgets: [],
        }
        state.tabs.push(tab)
        state.activeTabId = tab.id
        state.widgets = tab.widgets
        state.selectedWidgetId = null
        state.isDirty = true
      }),

    setActiveTab: (tabId) =>
      set((state) => {
        const tab = state.tabs.find((t) => t.id === tabId)
        if (!tab) return
        state.activeTabId = tab.id
        state.widgets = tab.widgets
        state.selectedWidgetId = tab.widgets[0]?.id ?? null
      }),

    renameTab: (tabId, name) =>
      set((state) => {
        const tab = state.tabs.find((t) => t.id === tabId)
        if (!tab) return
        const nextName = name.trim()
        if (!nextName) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        tab.name = nextName
        state.isDirty = true
      }),

    deleteTab: (tabId) =>
      set((state) => {
        if (state.tabs.length <= 1) return
        if (!state.tabs.some((t) => t.id === tabId)) return

        state.undoStack.push(createSnapshot(state))
        state.redoStack = []

        state.tabs = state.tabs.filter((t) => t.id !== tabId)
        if (state.activeTabId === tabId) {
          state.activeTabId = state.tabs[0]?.id ?? null
        }

        syncActiveWidgets(state)
        state.selectedWidgetId = state.widgets[0]?.id ?? null
        state.isDirty = true
      }),

    // === Widget CRUD ===
    addWidget: (widget) => {
      const id = generateId()
      set((state) => {
        syncActiveWidgets(state)
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []

        const maxY = state.widgets.reduce(
          (max, w) => Math.max(max, w.layout.y + w.layout.h),
          0,
        )

        state.widgets.push({
          ...widget,
          id,
          layout: {
            ...DEFAULT_WIDGET_SIZE,
            ...widget.layout,
            y: maxY,
          },
        })
        state.selectedWidgetId = id
        state.isDirty = true
      })
      return id
    },

    updateWidget: (id, updates) =>
      set((state) => {
        syncActiveWidgets(state)
        const widget = state.widgets.find((w) => w.id === id)
        if (widget) {
          state.undoStack.push(createSnapshot(state))
          state.redoStack = []
          Object.assign(widget, updates)
          state.isDirty = true
        }
      }),

    removeWidget: (id) =>
      set((state) => {
        syncActiveWidgets(state)
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.widgets = state.widgets.filter((w) => w.id !== id)
        getActiveTab(state).widgets = state.widgets
        if (state.selectedWidgetId === id) {
          state.selectedWidgetId = null
        }
        state.isDirty = true
      }),

    duplicateWidget: (id) => {
      const { tabs, activeTabId } = get()
      const activeTab = tabs.find((t) => t.id === activeTabId)
      const widget = activeTab?.widgets.find((w) => w.id === id)
      if (!widget) return null

      const newId = generateId()
      set((state) => {
        syncActiveWidgets(state)
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []

        const maxY = state.widgets.reduce(
          (max, w) => Math.max(max, w.layout.y + w.layout.h),
          0,
        )

        state.widgets.push({
          ...JSON.parse(JSON.stringify(widget)),
          id: newId,
          title: `${widget.title} (copy)`,
          layout: {
            ...widget.layout,
            y: maxY,
          },
        })
        state.selectedWidgetId = newId
        getActiveTab(state).widgets = state.widgets
        state.isDirty = true
      })
      return newId
    },

    // === Widget selection ===
    selectWidget: (id) =>
      set((state) => {
        state.selectedWidgetId = id
      }),

    // === Widget layout ===
    updateLayout: (id, layout) =>
      set((state) => {
        syncActiveWidgets(state)
        const widget = state.widgets.find((w) => w.id === id)
        if (widget) {
          Object.assign(widget.layout, layout)
          state.isDirty = true
        }
      }),

    updateLayouts: (layouts) =>
      set((state) => {
        syncActiveWidgets(state)
        for (const { id, layout } of layouts) {
          const widget = state.widgets.find((w) => w.id === id)
          if (widget) {
            widget.layout = layout
          }
        }
        state.isDirty = true
      }),

    // === Widget channels ===
    setChannel: (widgetId, channelId, fields) =>
      set((state) => {
        syncActiveWidgets(state)
        const widget = state.widgets.find((w) => w.id === widgetId)
        if (widget) {
          state.undoStack.push(createSnapshot(state))
          state.redoStack = []
          widget.channels[channelId] = fields
          state.isDirty = true
        }
      }),

    addToChannel: (widgetId, channelId, field) =>
      set((state) => {
        syncActiveWidgets(state)
        const widget = state.widgets.find((w) => w.id === widgetId)
        if (widget) {
          state.undoStack.push(createSnapshot(state))
          state.redoStack = []
          if (!widget.channels[channelId]) {
            widget.channels[channelId] = []
          }
          if (!widget.channels[channelId].some((f) => f.name === field.name)) {
            widget.channels[channelId].push(field)
          }
          state.isDirty = true
        }
      }),

    removeFromChannel: (widgetId, channelId, fieldName) =>
      set((state) => {
        syncActiveWidgets(state)
        const widget = state.widgets.find((w) => w.id === widgetId)
        if (widget?.channels[channelId]) {
          state.undoStack.push(createSnapshot(state))
          state.redoStack = []
          widget.channels[channelId] = widget.channels[channelId].filter(
            (f) => f.name !== fieldName,
          )
          state.isDirty = true
        }
      }),

    clearChannel: (widgetId, channelId) =>
      set((state) => {
        syncActiveWidgets(state)
        const widget = state.widgets.find((w) => w.id === widgetId)
        if (widget) {
          state.undoStack.push(createSnapshot(state))
          state.redoStack = []
          widget.channels[channelId] = []
          state.isDirty = true
        }
      }),

    // === Widget styles ===
    setStyle: (widgetId, styleId, value) =>
      set((state) => {
        syncActiveWidgets(state)
        const widget = state.widgets.find((w) => w.id === widgetId)
        if (widget) {
          state.undoStack.push(createSnapshot(state))
          state.redoStack = []
          widget.styles[styleId] = value
          state.isDirty = true
        }
      }),

    setStyles: (widgetId, styles) =>
      set((state) => {
        syncActiveWidgets(state)
        const widget = state.widgets.find((w) => w.id === widgetId)
        if (widget) {
          state.undoStack.push(createSnapshot(state))
          state.redoStack = []
          widget.styles = { ...widget.styles, ...styles }
          state.isDirty = true
        }
      }),

    // === Widget chart type ===
    setWidgetChartType: (widgetId, chartType) =>
      set((state) => {
        syncActiveWidgets(state)
        const widget = state.widgets.find((w) => w.id === widgetId)
        if (widget) {
          state.undoStack.push(createSnapshot(state))
          state.redoStack = []
          widget.chartType = chartType
          widget.channels = {}
          widget.styles = {}
          state.isDirty = true
        }
      }),

    // === Dashboard filters (renamed from globalFilters) ===
    addDashboardFilter: (filter) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.dashboardFilters.push({ ...filter, id: generateFilterId() })
        state.isDirty = true
      }),

    updateDashboardFilter: (id, updates) =>
      set((state) => {
        const filter = state.dashboardFilters.find((f) => f.id === id)
        if (filter) {
          Object.assign(filter, updates)
          state.isDirty = true
        }
      }),

    removeDashboardFilter: (id) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.dashboardFilters = state.dashboardFilters.filter(
          (f) => f.id !== id,
        )
        state.isDirty = true
      }),

    clearDashboardFilters: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.dashboardFilters = []
        state.isDirty = true
      }),

    // === Tab filters (biwave-07) ===
    addTabFilter: (tabId, filter) =>
      set((state) => {
        const tab = state.tabs.find((t) => t.id === tabId)
        if (!tab) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        if (!tab.filters) tab.filters = []
        tab.filters.push({ ...filter, id: generateFilterId() })
        state.isDirty = true
      }),

    updateTabFilter: (tabId, id, updates) =>
      set((state) => {
        const tab = state.tabs.find((t) => t.id === tabId)
        if (!tab?.filters) return
        const rule = tab.filters.find((r) => r.id === id)
        if (!rule) return
        Object.assign(rule, updates)
        state.isDirty = true
      }),

    removeTabFilter: (tabId, id) =>
      set((state) => {
        const tab = state.tabs.find((t) => t.id === tabId)
        if (!tab?.filters) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        tab.filters = tab.filters.filter((r) => r.id !== id)
        state.isDirty = true
      }),

    // === Calculated fields (per-Dataset) ===
    addCalculatedField: (datasetId, field) =>
      set((state) => {
        const dataset = state.datasets.find((d) => d.id === datasetId)
        if (!dataset) return
        if (dataset.calculatedFields.some((f) => f.name === field.name)) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        dataset.calculatedFields.push(field)
        state.isDirty = true
      }),

    updateCalculatedField: (datasetId, currentName, updates) =>
      set((state) => {
        const dataset = state.datasets.find((d) => d.id === datasetId)
        if (!dataset) return
        const field = dataset.calculatedFields.find(
          (f) => f.name === currentName,
        )
        if (!field) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        Object.assign(field, updates)
        state.isDirty = true
      }),

    removeCalculatedField: (datasetId, name) =>
      set((state) => {
        const dataset = state.datasets.find((d) => d.id === datasetId)
        if (!dataset) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        dataset.calculatedFields = dataset.calculatedFields.filter(
          (f) => f.name !== name,
        )
        state.isDirty = true
      }),

    // === History ===
    saveSnapshot: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
      }),

    undo: () =>
      set((state) => {
        const prev = state.undoStack.pop()
        if (!prev) return
        state.redoStack.push(createSnapshot(state))
        state.datasets = prev.datasets
        state.activeDatasetId = prev.activeDatasetId
        state.tabs = prev.tabs
        state.activeTabId = prev.activeTabId
        syncActiveWidgets(state)
        state.selectedWidgetId = state.widgets.some(
          (w) => w.id === prev.selectedWidgetId,
        )
          ? prev.selectedWidgetId
          : (state.widgets[0]?.id ?? null)
        state.dashboardFilters = prev.dashboardFilters
        state.isDirty = true
      }),

    redo: () =>
      set((state) => {
        const next = state.redoStack.pop()
        if (!next) return
        state.undoStack.push(createSnapshot(state))
        state.datasets = next.datasets
        state.activeDatasetId = next.activeDatasetId
        state.tabs = next.tabs
        state.activeTabId = next.activeTabId
        syncActiveWidgets(state)
        state.selectedWidgetId = state.widgets.some(
          (w) => w.id === next.selectedWidgetId,
        )
          ? next.selectedWidgetId
          : (state.widgets[0]?.id ?? null)
        state.dashboardFilters = next.dashboardFilters
        state.isDirty = true
      }),

    // === Dirty state ===
    markClean: () =>
      set((state) => {
        state.isDirty = false
      }),

    refreshDataset: () =>
      set((state) => {
        state.datasetRefreshSeq += 1
      }),
  })),
)

// Selectors

export const selectSelectedWidget = (state: DashboardStore) =>
  state.widgets.find((w) => w.id === state.selectedWidgetId) ?? null

export const selectWidgetById = (id: string) => (state: DashboardStore) =>
  state.widgets.find((w) => w.id === id) ?? null

export const selectActiveDataset = (state: DashboardStore): Dataset | null => {
  if (!state.activeDatasetId) return null
  return state.datasets.find((d) => d.id === state.activeDatasetId) ?? null
}

export const selectDatasetById =
  (id: string | null | undefined) =>
  (state: DashboardStore): Dataset | null => {
    if (!id) return null
    return state.datasets.find((d) => d.id === id) ?? null
  }
