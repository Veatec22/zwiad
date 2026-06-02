import type { DatasetField, FilterRule, SemanticType } from '../types'
import type { CalculatedField, Dataset, Widget } from './dashboardStore'

/** @deprecated kept for back-compat in dashboardConfig serializers — equivalent to `CalculatedField`. */
export interface DashboardCalculatedField {
  name: string
  expression: string
  semanticType: SemanticType
}

export interface DashboardTabConfig {
  id: string
  name: string
  widgets: Widget[]
  /** Tab-scope filters (biwave-07). Empty for v1 until that task lands. */
  filters?: FilterRule[]
}

export interface DashboardConfig {
  /** Per-Dataset metadata + calculated fields (ADR-0005). CSV bytes ship alongside in a Bundle. */
  datasets: Dataset[]
  activeDatasetId: string | null
  tabs: DashboardTabConfig[]
  activeTabId: string
  /** Renamed from `globalFilters`. biwave-07 will add `datasetId` to rules. */
  dashboardFilters: FilterRule[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number'
const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean'

const isWidget = (value: unknown): value is Widget => {
  if (!isRecord(value)) return false
  if (!isString(value.id)) return false
  if (!isString(value.type)) return false
  if (!isString(value.title)) return false
  if (!isString(value.datasetId)) return false
  if (!isRecord(value.layout)) return false
  if (!isNumber(value.layout.x)) return false
  if (!isNumber(value.layout.y)) return false
  if (!isNumber(value.layout.w)) return false
  if (!isNumber(value.layout.h)) return false
  if (!isRecord(value.channels)) return false
  if (!isRecord(value.styles)) return false
  if (!Array.isArray(value.filters)) return false
  return true
}

const isFilterRule = (value: unknown): value is FilterRule => {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.fieldName) &&
    isString(value.operator) &&
    'value' in value &&
    isBoolean(value.enabled)
  )
}

const isCalculatedField = (value: unknown): value is CalculatedField => {
  if (!isRecord(value)) return false
  return (
    isString(value.name) &&
    isString(value.expression) &&
    isString(value.semanticType)
  )
}

const isDatasetField = (value: unknown): value is DatasetField => {
  if (!isRecord(value)) return false
  return (
    isString(value.name) &&
    isString(value.duckdbType) &&
    isString(value.semanticType)
  )
}

const isDataset = (value: unknown): value is Dataset => {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.fileName) &&
    isString(value.csvHash) &&
    Array.isArray(value.fields) &&
    value.fields.every(isDatasetField) &&
    Array.isArray(value.calculatedFields) &&
    value.calculatedFields.every(isCalculatedField) &&
    isNumber(value.rowCount)
  )
}

const generateTabId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab_${Math.random().toString(36).slice(2, 10)}`

const createDefaultTab = (): DashboardTabConfig => ({
  id: generateTabId(),
  name: 'Tab 1',
  widgets: [],
})

export const createDefaultDashboardConfig = (): DashboardConfig => {
  const tab = createDefaultTab()
  return {
    datasets: [],
    activeDatasetId: null,
    tabs: [tab],
    activeTabId: tab.id,
    dashboardFilters: [],
  }
}

export const normalizeDashboardConfig = (
  raw: unknown,
): { config: DashboardConfig } => {
  if (!isRecord(raw)) {
    return { config: createDefaultDashboardConfig() }
  }

  const tabsRaw = raw.tabs
  const activeTabIdRaw = raw.activeTabId
  const dashboardFiltersRaw = raw.dashboardFilters ?? raw.globalFilters
  const datasetsRaw = raw.datasets
  const activeDatasetIdRaw = raw.activeDatasetId

  const tabs: DashboardTabConfig[] = Array.isArray(tabsRaw)
    ? tabsRaw.filter(isRecord).map((t) => {
        const id = isString(t.id) ? t.id : generateTabId()
        const name = isString(t.name) ? t.name : 'Tab'
        const widgets = Array.isArray(t.widgets)
          ? t.widgets.filter(isWidget)
          : []
        const filters = Array.isArray(t.filters)
          ? t.filters.filter(isFilterRule)
          : []
        return { id, name, widgets, filters }
      })
    : []

  if (tabs.length === 0) {
    return { config: createDefaultDashboardConfig() }
  }

  const activeTabId = isString(activeTabIdRaw) ? activeTabIdRaw : tabs[0].id
  const activeTabExists = tabs.some((t) => t.id === activeTabId)

  const datasets: Dataset[] = Array.isArray(datasetsRaw)
    ? datasetsRaw.filter(isDataset)
    : []
  const activeDatasetId =
    isString(activeDatasetIdRaw) &&
    datasets.some((d) => d.id === activeDatasetIdRaw)
      ? activeDatasetIdRaw
      : (datasets[0]?.id ?? null)

  return {
    config: {
      datasets,
      activeDatasetId,
      tabs,
      activeTabId: activeTabExists ? activeTabId : tabs[0].id,
      dashboardFilters: Array.isArray(dashboardFiltersRaw)
        ? dashboardFiltersRaw.filter(isFilterRule)
        : [],
    },
  }
}

export const buildDashboardConfig = (args: {
  datasets: Dataset[]
  activeDatasetId: string | null
  tabs: DashboardTabConfig[]
  activeTabId: string
  dashboardFilters: FilterRule[]
}): DashboardConfig => ({
  datasets: args.datasets,
  activeDatasetId: args.activeDatasetId,
  tabs: args.tabs,
  activeTabId: args.activeTabId,
  dashboardFilters: args.dashboardFilters,
})
