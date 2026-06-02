import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Aggregation, DatasetField, SemanticType } from '../types'

// Chart Types

export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'scatter'
  | 'pie'
  | 'boxplot'
  | 'heatmap'
  | 'funnel'
  | 'sankey'
  | 'treemap'
  | 'combo' // bar + line

export type SortDirection = 'asc' | 'desc' | 'none'
export type Orientation = 'vertical' | 'horizontal'
export type StackMode = boolean

// Encoded Field

export interface EncodedField {
  name: string
  semanticType: SemanticType
  aggregation?: Aggregation
}

export interface CalculatedField {
  name: string
  expression: string
  semanticType: SemanticType
}

// Filter Types

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'between'
  | 'isNull'
  | 'isNotNull'

export interface FilterRule {
  id: string
  fieldName: string
  semanticType: SemanticType
  operator: FilterOperator
  value: unknown
  enabled: boolean
}

// Chart State

interface ChartState {
  // Schema
  fields: DatasetField[]
  calculatedFields: CalculatedField[]

  // Encoding channels - NOW ARRAYS for multi-dimension support
  columns: EncodedField[] // X axis (dimensions)
  rows: EncodedField[] // Y axis (measures)
  color: EncodedField | null // Color encoding (dimension or measure)
  size: EncodedField | null // Size encoding (for scatter)
  detail: EncodedField | null // Detail (adds marks without visual encoding)

  // For combo charts - which measure goes to secondary axis
  secondaryMeasure: string | null

  // For sankey/treemap - source and target fields
  sourceField: EncodedField | null
  targetField: EncodedField | null

  // Visual config
  chartType: ChartType
  orientation: Orientation
  stackMode: boolean
  primaryColor: string
  colorPalette: string[]
  aggregation: Aggregation
  sortDirection: SortDirection

  // Filters
  filters: FilterRule[]

  // History for undo/redo
  undoStack: Snapshot[]
  redoStack: Snapshot[]
}

// Snapshot for undo/redo (without stacks to avoid recursion)
interface Snapshot {
  columns: EncodedField[]
  rows: EncodedField[]
  color: EncodedField | null
  size: EncodedField | null
  detail: EncodedField | null
  secondaryMeasure: string | null
  sourceField: EncodedField | null
  targetField: EncodedField | null
  chartType: ChartType
  orientation: Orientation
  stackMode: boolean
  aggregation: Aggregation
  sortDirection: SortDirection
  filters: FilterRule[]
  calculatedFields: CalculatedField[]
}

// Actions

interface ChartActions {
  // Schema
  setFields: (fields: DatasetField[]) => void
  resetForNewDataset: (fields: DatasetField[]) => void
  addCalculatedField: (field: CalculatedField) => void
  removeCalculatedField: (name: string) => void
  clearCalculatedFields: () => void

  // Encoding channels - multi-field support
  addColumn: (field: EncodedField) => void
  removeColumn: (fieldName: string) => void
  reorderColumns: (fromIndex: number, toIndex: number) => void
  clearColumns: () => void
  setColumns: (fields: EncodedField[]) => void

  addRow: (field: EncodedField) => void
  removeRow: (fieldName: string) => void
  reorderRows: (fromIndex: number, toIndex: number) => void
  clearRows: () => void
  setRows: (fields: EncodedField[]) => void

  setColor: (field: EncodedField | null) => void
  setSize: (field: EncodedField | null) => void
  setDetail: (field: EncodedField | null) => void

  // Combo chart
  setSecondaryMeasure: (fieldName: string | null) => void

  // Sankey/Treemap
  setSourceField: (field: EncodedField | null) => void
  setTargetField: (field: EncodedField | null) => void

  // Visual config
  setChartType: (type: ChartType) => void
  setOrientation: (orientation: Orientation) => void
  toggleOrientation: () => void
  setStackMode: (mode: boolean) => void
  setPrimaryColor: (color: string) => void
  setColorPalette: (palette: string[]) => void
  setAggregation: (agg: Aggregation) => void
  toggleSort: () => void

  // Filters
  addFilter: (filter: Omit<FilterRule, 'id'>) => void
  updateFilter: (id: string, updates: Partial<FilterRule>) => void
  removeFilter: (id: string) => void
  toggleFilter: (id: string) => void
  clearFilters: () => void

  // Actions
  transpose: () => void // Now swaps orientation for bar/line charts
  clear: () => void
  undo: () => void
  redo: () => void
}

type ChartStore = ChartState & ChartActions

// Default Values

const DEFAULT_PALETTE = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
]

const createSnapshot = (state: ChartState): Snapshot => ({
  columns: [...state.columns],
  rows: [...state.rows],
  color: state.color,
  size: state.size,
  detail: state.detail,
  secondaryMeasure: state.secondaryMeasure,
  sourceField: state.sourceField,
  targetField: state.targetField,
  chartType: state.chartType,
  orientation: state.orientation,
  stackMode: state.stackMode,
  aggregation: state.aggregation,
  sortDirection: state.sortDirection,
  filters: [...state.filters],
  calculatedFields: [...state.calculatedFields],
})

const generateId = () => Math.random().toString(36).substring(2, 9)

// Store

export const useChartEngineStore = create<ChartStore>()(
  immer((set) => ({
    // Initial state
    fields: [],
    calculatedFields: [],
    columns: [],
    rows: [],
    color: null,
    size: null,
    detail: null,
    secondaryMeasure: null,
    sourceField: null,
    targetField: null,
    chartType: 'bar',
    orientation: 'vertical',
    stackMode: false,
    primaryColor: 'hsl(221, 83%, 53%)',
    colorPalette: DEFAULT_PALETTE,
    aggregation: 'sum',
    sortDirection: 'desc',
    filters: [],
    undoStack: [],
    redoStack: [],

    // === Schema ===
    setFields: (fields) =>
      set((state) => {
        state.fields = fields
      }),

    resetForNewDataset: (fields) =>
      set((state) => {
        state.fields = fields
        state.calculatedFields = []
        state.columns = []
        state.rows = []
        state.color = null
        state.size = null
        state.detail = null
        state.secondaryMeasure = null
        state.sourceField = null
        state.targetField = null
        state.filters = []
        state.undoStack = []
        state.redoStack = []
      }),

    addCalculatedField: (field) =>
      set((state) => {
        if (state.calculatedFields.some((f) => f.name === field.name)) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.calculatedFields.push(field)
      }),

    removeCalculatedField: (name) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.calculatedFields = state.calculatedFields.filter(
          (f) => f.name !== name,
        )
      }),

    clearCalculatedFields: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.calculatedFields = []
      }),

    // === Columns (X) - Multi-field ===
    addColumn: (field) =>
      set((state) => {
        // Don't add duplicates
        if (state.columns.some((f) => f.name === field.name)) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.columns.push(field)
      }),

    removeColumn: (fieldName) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.columns = state.columns.filter((f) => f.name !== fieldName)
      }),

    reorderColumns: (fromIndex, toIndex) =>
      set((state) => {
        if (fromIndex === toIndex) return
        if (fromIndex < 0 || fromIndex >= state.columns.length) return
        if (toIndex < 0 || toIndex >= state.columns.length) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        const [moved] = state.columns.splice(fromIndex, 1)
        state.columns.splice(toIndex, 0, moved)
      }),

    clearColumns: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.columns = []
      }),

    setColumns: (fields) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.columns = fields
      }),

    // === Rows (Y) - Multi-field ===
    addRow: (field) =>
      set((state) => {
        if (state.rows.some((f) => f.name === field.name)) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.rows.push(field)
      }),

    removeRow: (fieldName) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.rows = state.rows.filter((f) => f.name !== fieldName)
        // Clear secondary measure if it was removed
        if (state.secondaryMeasure === fieldName) {
          state.secondaryMeasure = null
        }
      }),

    reorderRows: (fromIndex, toIndex) =>
      set((state) => {
        if (fromIndex === toIndex) return
        if (fromIndex < 0 || fromIndex >= state.rows.length) return
        if (toIndex < 0 || toIndex >= state.rows.length) return
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        const [moved] = state.rows.splice(fromIndex, 1)
        state.rows.splice(toIndex, 0, moved)
      }),

    clearRows: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.rows = []
        state.secondaryMeasure = null
      }),

    setRows: (fields) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.rows = fields
      }),

    // === Other encodings ===
    setColor: (field) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.color = field
      }),

    setSize: (field) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.size = field
      }),

    setDetail: (field) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.detail = field
      }),

    // === Combo chart ===
    setSecondaryMeasure: (fieldName) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.secondaryMeasure = fieldName
      }),

    // === Sankey/Treemap ===
    setSourceField: (field) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.sourceField = field
      }),

    setTargetField: (field) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.targetField = field
      }),

    // === Visual config ===
    setChartType: (type) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.chartType = type
      }),

    setOrientation: (orientation) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.orientation = orientation
      }),

    toggleOrientation: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.orientation =
          state.orientation === 'vertical' ? 'horizontal' : 'vertical'
      }),

    setStackMode: (mode) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.stackMode = mode
      }),

    setPrimaryColor: (color) =>
      set((state) => {
        state.primaryColor = color
      }),

    setColorPalette: (palette) =>
      set((state) => {
        state.colorPalette = palette
      }),

    setAggregation: (agg) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.aggregation = agg
      }),

    toggleSort: () =>
      set((state) => {
        const order: SortDirection[] = ['desc', 'asc', 'none']
        const idx = order.indexOf(state.sortDirection)
        state.sortDirection = order[(idx + 1) % order.length]
      }),

    // === Filters ===
    addFilter: (filter) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.filters.push({ ...filter, id: generateId() })
      }),

    updateFilter: (id, updates) =>
      set((state) => {
        const filter = state.filters.find((f) => f.id === id)
        if (filter) {
          Object.assign(filter, updates)
        }
      }),

    removeFilter: (id) =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.filters = state.filters.filter((f) => f.id !== id)
      }),

    toggleFilter: (id) =>
      set((state) => {
        const filter = state.filters.find((f) => f.id === id)
        if (filter) {
          filter.enabled = !filter.enabled
        }
      }),

    clearFilters: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.filters = []
      }),

    // === Actions ===
    transpose: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        // For bar/line/area - toggle orientation
        if (['bar', 'line', 'area', 'combo'].includes(state.chartType)) {
          state.orientation =
            state.orientation === 'vertical' ? 'horizontal' : 'vertical'
        }
      }),

    clear: () =>
      set((state) => {
        state.undoStack.push(createSnapshot(state))
        state.redoStack = []
        state.columns = []
        state.rows = []
        state.color = null
        state.size = null
        state.detail = null
        state.secondaryMeasure = null
        state.sourceField = null
        state.targetField = null
        state.filters = []
      }),

    undo: () =>
      set((state) => {
        const prev = state.undoStack.pop()
        if (!prev) return
        state.redoStack.push(createSnapshot(state))
        // Restore
        state.columns = prev.columns
        state.rows = prev.rows
        state.color = prev.color
        state.size = prev.size
        state.detail = prev.detail
        state.secondaryMeasure = prev.secondaryMeasure
        state.sourceField = prev.sourceField
        state.targetField = prev.targetField
        state.chartType = prev.chartType
        state.orientation = prev.orientation
        state.stackMode = prev.stackMode
        state.aggregation = prev.aggregation
        state.sortDirection = prev.sortDirection
        state.filters = prev.filters
      }),

    redo: () =>
      set((state) => {
        const next = state.redoStack.pop()
        if (!next) return
        state.undoStack.push(createSnapshot(state))
        // Restore
        state.columns = next.columns
        state.rows = next.rows
        state.color = next.color
        state.size = next.size
        state.detail = next.detail
        state.secondaryMeasure = next.secondaryMeasure
        state.sourceField = next.sourceField
        state.targetField = next.targetField
        state.chartType = next.chartType
        state.orientation = next.orientation
        state.stackMode = next.stackMode
        state.aggregation = next.aggregation
        state.sortDirection = next.sortDirection
        state.filters = next.filters
      }),
  })),
)
