import { create } from 'zustand'

import type { SailorDataset, SailorProfile } from '../sailorTypes'

export const pageSizeOptions = [50, 100, 200] as const
export type PageSize = (typeof pageSizeOptions)[number]

export interface StoredDataset {
  id: string
  fileName: string
  displayName: string
  bytes: Uint8Array
  profile: SailorProfile
}

export interface QueryState {
  query: string
  rows: Array<Record<string, unknown>>
  hasRunQuery: boolean
  pageIndex: number
  pageSize: PageSize
}

interface SailorState {
  datasets: StoredDataset[]
  activeDatasetId: string | null
  queryState: QueryState

  addDataset: (dataset: StoredDataset) => void
  removeDataset: (id: string) => void
  setActiveDataset: (id: string) => void
  renameDataset: (id: string, displayName: string) => void
  setQueryState: (partial: Partial<QueryState>) => void
  reset: () => void
}

const defaultQueryState = (): QueryState => ({
  query: '',
  rows: [],
  hasRunQuery: false,
  pageIndex: 0,
  pageSize: 50,
})

export const useSailorStore = create<SailorState>((set) => ({
  datasets: [],
  activeDatasetId: null,
  queryState: defaultQueryState(),

  addDataset: (dataset) =>
    set((state) => ({
      datasets: [...state.datasets, dataset],
      activeDatasetId: dataset.id,
      queryState:
        state.queryState.query.trim() === ''
          ? {
              ...state.queryState,
              query: `SELECT * FROM "${dataset.displayName}" LIMIT 100`,
            }
          : state.queryState,
    })),

  removeDataset: (id) =>
    set((state) => {
      const datasets = state.datasets.filter((d) => d.id !== id)
      const activeDatasetId =
        state.activeDatasetId === id
          ? (datasets[0]?.id ?? null)
          : state.activeDatasetId
      return { datasets, activeDatasetId }
    }),

  setActiveDataset: (id) => set({ activeDatasetId: id }),

  renameDataset: (id, displayName) =>
    set((state) => {
      const trimmed = displayName.trim()
      if (!trimmed) return state
      const target = state.datasets.find((d) => d.id === id)
      if (!target || target.displayName === trimmed) return state
      const collision = state.datasets.some(
        (d) => d.id !== id && d.displayName === trimmed,
      )
      if (collision) return state
      return {
        datasets: state.datasets.map((d) =>
          d.id === id ? { ...d, displayName: trimmed } : d,
        ),
      }
    }),

  setQueryState: (partial) =>
    set((state) => ({ queryState: { ...state.queryState, ...partial } })),

  reset: () =>
    set({
      datasets: [],
      activeDatasetId: null,
      queryState: defaultQueryState(),
    }),
}))

export function toLegacyDataset(stored: StoredDataset): SailorDataset {
  return {
    tableName: stored.displayName,
    fileName: stored.fileName,
    profile: stored.profile,
  }
}

export function makeTableNameFromFileName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, '')
  let cleaned = base.replace(/[^A-Za-z0-9_]/g, '_').replace(/_+/g, '_')
  cleaned = cleaned.replace(/^_+|_+$/g, '')
  if (!cleaned) cleaned = 'dataset'
  if (/^[0-9]/.test(cleaned)) cleaned = `t_${cleaned}`
  return cleaned
}

export function makeUniqueTableName(base: string, existing: string[]) {
  if (!existing.includes(base)) return base
  let i = 2
  while (existing.includes(`${base}_${i}`)) i++
  return `${base}_${i}`
}
