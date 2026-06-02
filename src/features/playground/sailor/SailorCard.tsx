import { sql as sqlLang } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import {
  type DockviewApi,
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewHeaderActionsProps,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps,
  type IWatermarkPanelProps,
  themeDark,
  themeLight,
} from 'dockview'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bot,
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Loader2,
  Play,
  Plus,
  Send,
  SplitSquareHorizontal,
  Upload,
  X,
} from 'lucide-react'
import type { ChangeEvent, DragEvent, KeyboardEvent, RefObject } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import AppCodeMirror from '@/components/common/AppCodeMirror'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { queryToRows } from '@/features/playground/_shared/duckdb'
import { askSailorAi, listSailorModels } from './aiClient'
import {
  ensureDatasetRegistered,
  getSharedConnection,
} from './connectionRegistry'
import type {
  SailorAiProviderId,
  SailorAiResponse,
  SailorModel,
} from './sailorTypes'
import {
  completeOpenRouterPkceAuthFromUrl,
  forgetOpenRouterApiKey,
  hasOpenRouterApiKey,
  startOpenRouterPkceAuth,
  storeOpenRouterApiKey,
} from './openRouterAuth'
import { getDefaultWebLlmModelId } from './webLlmClient'
import { DatasetOverviewPanel } from './overview/DatasetOverviewPanel'
import { QueryResultProfilePanel } from './overview/QueryResultProfilePanel'
import { buildSailorProfile } from './profileBuilder'
import {
  makeTableNameFromFileName,
  makeUniqueTableName,
  type PageSize,
  pageSizeOptions,
  type StoredDataset,
  toLegacyDataset,
  useSailorStore,
} from './store/sailorStore'

// ─── constants ────────────────────────────────────────────────────────────────

const maxFileBytes = 25 * 1024 * 1024
const aiProviderStorageKey = 'sailor.ai.provider'
const aiModelStorageKeyPrefix = 'sailor.ai.model.'
const defaultAiProvider: SailorAiProviderId = 'openrouter'
const legacyWebLlmModelId = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'

// ─── shared context ───────────────────────────────────────────────────────────

interface SailorCtxValue {
  nextTabNumber: () => number
  dockviewApiRef: RefObject<DockviewApi | null>
  registerActivePanelApply: (apply: (sql: string) => void) => void
  onToggleAi: () => void
}

const SailorCtx = createContext<SailorCtxValue | null>(null)

function useSailorCtx() {
  const ctx = useContext(SailorCtx)
  if (!ctx) throw new Error('SailorCtx missing')
  return ctx
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: unknown) {
  if (value === null || value === undefined) return ''
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return String(value)
  return JSON.stringify(value)
}

function getFileSizeLabel(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function groupModelsByOwner(models: SailorModel[]) {
  const groups = new Map<string, SailorModel[]>()
  for (const model of models) {
    groups.set(model.owner, [...(groups.get(model.owner) ?? []), model])
  }
  return [...groups.entries()].map(([owner, ownerModels]) => ({
    owner,
    models: ownerModels,
  }))
}

function getStoredAiProvider(): SailorAiProviderId {
  const value = localStorage.getItem(aiProviderStorageKey)

  return value === 'openrouter' || value === 'webllm'
    ? value
    : defaultAiProvider
}

function getStoredModelId(provider: SailorAiProviderId) {
  return localStorage.getItem(`${aiModelStorageKeyPrefix}${provider}`) ?? ''
}

function getInitialWebLlmModelId() {
  const storedModelId = getStoredModelId('webllm')

  return storedModelId && storedModelId !== legacyWebLlmModelId
    ? storedModelId
    : getDefaultWebLlmModelId()
}

function setStoredAiProvider(provider: SailorAiProviderId) {
  localStorage.setItem(aiProviderStorageKey, provider)
}

function setStoredModelId(provider: SailorAiProviderId, modelId: string) {
  localStorage.setItem(`${aiModelStorageKeyPrefix}${provider}`, modelId)
}

function csvCell(value: unknown) {
  const text = formatValue(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function rowsToCsv(rows: Array<Record<string, unknown>>, columns: string[]) {
  return [
    columns.map(csvCell).join(','),
    ...rows.map((row) => columns.map((col) => csvCell(row[col])).join(',')),
  ].join('\n')
}

function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function getResultRange(
  pageIndex: number,
  pageSize: PageSize,
  rowCount: number,
) {
  if (rowCount === 0) return '0-0'
  const start = pageIndex * pageSize + 1
  const end = Math.min(rowCount, (pageIndex + 1) * pageSize)
  return `${start}-${end}`
}

interface ResultSortState {
  column: string
  direction: 'asc' | 'desc'
}

type ComparableValue =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }

function getComparableValue(value: unknown): ComparableValue | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'number', value }
  }

  if (typeof value === 'bigint') {
    return { kind: 'number', value: Number(value) }
  }

  if (typeof value === 'boolean') {
    return { kind: 'number', value: value ? 1 : 0 }
  }

  if (typeof value === 'string') {
    const numeric = Number(value)
    if (value.trim() && Number.isFinite(numeric)) {
      return { kind: 'number', value: numeric }
    }

    const timestamp = Date.parse(value)
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && Number.isFinite(timestamp)) {
      return { kind: 'number', value: timestamp }
    }

    return { kind: 'string', value: value.toLocaleLowerCase() }
  }

  return { kind: 'string', value: formatValue(value).toLocaleLowerCase() }
}

function compareResultValues(left: unknown, right: unknown) {
  const leftValue = getComparableValue(left)
  const rightValue = getComparableValue(right)

  if (leftValue === null && rightValue === null) return 0
  if (leftValue === null) return 1
  if (rightValue === null) return -1

  if (leftValue.kind === 'number' && rightValue.kind === 'number') {
    return leftValue.value - rightValue.value
  }

  return String(leftValue.value).localeCompare(
    String(rightValue.value),
    undefined,
    {
      numeric: true,
      sensitivity: 'base',
    },
  )
}

// ─── SqlWorkspacePanel ────────────────────────────────────────────────────────

function SqlWorkspacePanel({ api }: IDockviewPanelProps) {
  const { t } = useTranslation()
  const ctx = useSailorCtx()

  const storedQueryState = useSailorStore((s) => s.queryState)
  const setQueryState = useSailorStore((s) => s.setQueryState)
  const hasAnyDataset = useSailorStore((s) => s.datasets.length > 0)

  const [query, setQuery] = useState(storedQueryState.query)
  const [rows, setRows] = useState<Array<Record<string, unknown>>>(
    storedQueryState.rows,
  )
  const [hasRunQuery, setHasRunQuery] = useState(storedQueryState.hasRunQuery)
  const [pageSize, setPageSize] = useState<PageSize>(storedQueryState.pageSize)
  const [pageIndex, setPageIndex] = useState(storedQueryState.pageIndex)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [resultsTab, setResultsTab] = useState('results')
  const [sortState, setSortState] = useState<ResultSortState | null>(null)

  const columns = useMemo(
    () => (rows.length === 0 ? [] : Object.keys(rows[0] ?? {})),
    [rows],
  )

  const sortedRows = useMemo(() => {
    if (!sortState) return rows

    return [...rows].sort((left, right) => {
      const comparison = compareResultValues(
        left[sortState.column],
        right[sortState.column],
      )

      return sortState.direction === 'asc' ? comparison : -comparison
    })
  }, [rows, sortState])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const paginatedRows = useMemo(
    () => sortedRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [pageIndex, pageSize, sortedRows],
  )
  const rowKeyByObject = useMemo(() => {
    const keys = new WeakMap<Record<string, unknown>, string>()

    sortedRows.forEach((row, index) => {
      const fingerprint = columns
        .map((col) => formatValue(row[col]))
        .join('\u001f')
      keys.set(row, `${index}:${fingerprint}`)
    })

    return keys
  }, [columns, sortedRows])

  const runQuery = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setError(t('sailor.errors.queryFirst'))
        return
      }
      setIsRunning(true)
      setError(null)
      try {
        const connection = await getSharedConnection()
        const nextRows = await queryToRows(connection.conn, q)
        setRows(nextRows)
        setHasRunQuery(true)
        setPageIndex(0)
        setSortState(null)
        setQueryState({
          query: q,
          rows: nextRows,
          hasRunQuery: true,
          pageIndex: 0,
        })
      } catch (e) {
        setError(
          e instanceof Error ? e.message : t('sailor.errors.queryFailed'),
        )
      } finally {
        setIsRunning(false)
      }
    },
    [setQueryState, t],
  )

  const handleQueryChange = (next: string) => {
    setQuery(next)
    setQueryState({ query: next })
  }

  const handlePageSizeChange = (next: PageSize) => {
    setPageSize(next)
    setPageIndex(0)
    setQueryState({ pageSize: next, pageIndex: 0 })
  }

  const handlePageIndexChange = (next: number) => {
    setPageIndex(next)
    setQueryState({ pageIndex: next })
  }

  const handleSortColumn = (column: string) => {
    setPageIndex(0)
    setQueryState({ pageIndex: 0 })
    setSortState((current) => {
      if (!current || current.column !== column) {
        return { column, direction: 'asc' }
      }

      if (current.direction === 'asc') {
        return { column, direction: 'desc' }
      }

      return null
    })
  }

  // Stable ref so the AI can call the latest runQuery
  const applyRef = useRef<(q: string) => void>(() => {})
  useEffect(() => {
    applyRef.current = (q: string) => {
      setQuery(q)
      setQueryState({ query: q })
      void runQuery(q)
    }
  })

  // Register as active panel target for AI suggestions
  useEffect(() => {
    const register = () => {
      ctx.registerActivePanelApply((q) => applyRef.current(q))
    }
    if (api.isActive) register()
    const disposable = api.onDidActiveChange(({ isActive }) => {
      if (isActive) register()
    })
    return () => disposable.dispose()
  }, [api, ctx])

  const exportResults = () => {
    if (rows.length === 0 || columns.length === 0) return
    downloadTextFile('data_explorer_results.csv', rowsToCsv(rows, columns))
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Editor */}
      <section className="border-border border-b">
        <div className="flex items-center justify-end gap-3 border-border border-b px-3 py-2">
          <Button
            disabled={isRunning || !query.trim() || !hasAnyDataset}
            onClick={() => void runQuery(query)}
            size="sm"
            type="button"
          >
            {isRunning ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Play aria-hidden="true" size={15} />
            )}
            {t('sailor.run')}
          </Button>
        </div>
        <AppCodeMirror
          basicSetup={{ foldGutter: false, highlightActiveLine: true }}
          editable
          extensions={[sqlLang(), EditorView.lineWrapping]}
          height="200px"
          onChange={handleQueryChange}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault()
              void runQuery(query)
            }
          }}
          value={query}
        />
      </section>

      {/* Results */}
      <Tabs
        className="flex min-h-0 flex-1 flex-col gap-0"
        onValueChange={setResultsTab}
        value={resultsTab}
      >
        <div className="flex items-center justify-between gap-2 border-border border-b px-3 py-2">
          <TabsList className="h-8">
            <TabsTrigger className="px-3 text-xs" value="results">
              Wyniki
            </TabsTrigger>
            <TabsTrigger className="px-3 text-xs" value="profile">
              Profil
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              disabled={rows.length === 0}
              onClick={exportResults}
              size="sm"
              type="button"
              variant="outline"
            >
              <Download aria-hidden="true" size={14} />
              {t('sailor.exportCsv')}
            </Button>
          </div>
        </div>

        <TabsContent className="min-h-0 flex-1 overflow-auto" value="results">
          <div className="min-h-full">
            {error ? (
              <p className="p-4 text-destructive text-sm">{error}</p>
            ) : !hasRunQuery ? (
              <div className="grid h-full min-h-[180px] place-items-center p-6 text-center">
                <div>
                  <p className="font-semibold text-sm">
                    {t('sailor.noQueryResults')}
                  </p>
                  <p className="mt-1 max-w-sm text-muted-foreground text-sm leading-6">
                    {t('sailor.datasetLoaded')}
                  </p>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <p className="p-4 text-muted-foreground text-sm">
                {t('sailor.queryNoRows')}
              </p>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {columns.map((col) => (
                      <th
                        className="border-border border-b px-3 py-2 font-semibold"
                        key={col}
                      >
                        <button
                          className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => handleSortColumn(col)}
                          type="button"
                        >
                          <span className="truncate">{col}</span>
                          {sortState?.column === col ? (
                            sortState.direction === 'asc' ? (
                              <ArrowUp aria-hidden="true" size={12} />
                            ) : (
                              <ArrowDown aria-hidden="true" size={12} />
                            )
                          ) : (
                            <ArrowUpDown
                              aria-hidden="true"
                              className="text-muted-foreground"
                              size={12}
                            />
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr
                      className="border-border border-b hover:bg-muted/60"
                      key={
                        rowKeyByObject.get(row) ??
                        columns
                          .map((col) => formatValue(row[col]))
                          .join('\u001f')
                      }
                    >
                      {columns.map((col) => (
                        <td
                          className="max-w-64 truncate px-3 py-2 font-mono"
                          key={col}
                        >
                          {formatValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent className="min-h-0 flex-1 overflow-auto" value="profile">
          {error ? (
            <p className="p-4 text-destructive text-sm">{error}</p>
          ) : !hasRunQuery ? (
            <div className="grid h-full min-h-[180px] place-items-center p-6 text-center">
              <div>
                <p className="font-semibold text-sm">Brak profilu</p>
                <p className="mt-1 max-w-sm text-muted-foreground text-sm leading-6">
                  Uruchom zapytanie SQL, zeby zobaczyc profil wynikow.
                </p>
              </div>
            </div>
          ) : (
            <QueryResultProfilePanel columns={columns} rows={rows} />
          )}
        </TabsContent>

        {resultsTab === 'results' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-border border-t px-3 py-2">
            <span className="text-muted-foreground text-xs">
              {hasRunQuery
                ? `${getResultRange(pageIndex, pageSize, rows.length)} of ${rows.length.toLocaleString()} rows`
                : t('sailor.queryPlaceholder')}
            </span>
            <div className="flex items-center gap-2">
              <Button
                disabled={!hasRunQuery || pageIndex === 0}
                onClick={() =>
                  handlePageIndexChange(Math.max(0, pageIndex - 1))
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <ChevronLeft aria-hidden="true" size={14} />
                {t('sailor.prev')}
              </Button>
              <Button
                disabled={!hasRunQuery || pageIndex >= pageCount - 1}
                onClick={() =>
                  handlePageIndexChange(Math.min(pageCount - 1, pageIndex + 1))
                }
                size="sm"
                type="button"
                variant="outline"
              >
                {t('sailor.next')}
                <ChevronRight aria-hidden="true" size={14} />
              </Button>
              <label
                className="text-muted-foreground text-xs"
                htmlFor={`page-size-${api.id}`}
              >
                {t('sailor.rows')}
              </label>
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                id={`page-size-${api.id}`}
                onChange={(e) =>
                  handlePageSizeChange(Number(e.target.value) as PageSize)
                }
                value={pageSize}
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </Tabs>
    </div>
  )
}

// ─── SqlTabHeader ─────────────────────────────────────────────────────────────

function SqlTabHeader({ api, containerApi }: IDockviewPanelHeaderProps) {
  const ctx = useSailorCtx()
  const [isActive, setIsActive] = useState(api.isActive)

  useEffect(() => {
    const d = api.onDidActiveChange((e) => setIsActive(e.isActive))
    return () => d.dispose()
  }, [api])

  const splitRight = (e: React.MouseEvent) => {
    e.stopPropagation()
    const n = ctx.nextTabNumber()
    containerApi.addPanel({
      id: `sql-${Date.now()}`,
      component: 'sql',
      tabComponent: 'sql-tab',
      title: `SQL ${n}`,
      position: { referencePanel: api.id, direction: 'right' },
    })
  }

  const closeTab = (e: React.MouseEvent) => {
    e.stopPropagation()
    api.close()
  }

  return (
    <div
      className={`flex h-full cursor-pointer select-none items-center gap-1 px-2 text-xs transition-colors ${
        isActive ? 'text-foreground' : 'text-muted-foreground'
      }`}
    >
      <span className="max-w-28 truncate">{api.title ?? api.id}</span>
      <button
        className="ml-0.5 rounded p-0.5 opacity-40 hover:bg-muted hover:opacity-100"
        onClick={splitRight}
        title="Split right"
        type="button"
      >
        <SplitSquareHorizontal size={12} />
      </button>
      <button
        className="rounded p-0.5 opacity-40 hover:bg-muted hover:opacity-100"
        onClick={closeTab}
        title="Close"
        type="button"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Watermark (shown when all panels are closed) ─────────────────────────────

function DockviewWatermark({ containerApi }: IWatermarkPanelProps) {
  const ctx = useSailorCtx()

  const addTab = () => {
    const n = ctx.nextTabNumber()
    containerApi.addPanel({
      id: `sql-${Date.now()}`,
      component: 'sql',
      tabComponent: 'sql-tab',
      title: `SQL ${n}`,
    })
  }

  return (
    <div className="grid h-full place-items-center bg-background">
      <button
        className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-muted-foreground text-sm transition-colors hover:border-foreground hover:text-foreground"
        onClick={addTab}
        type="button"
      >
        <Plus size={15} />
        New SQL tab
      </button>
    </div>
  )
}

// ─── Tab bar right actions (AI toggle) ───────────────────────────────────────

function DockviewRightActions(_: IDockviewHeaderActionsProps) {
  const ctx = useSailorCtx()
  return (
    <div className="flex items-center pr-1">
      <button
        className="flex h-7 items-center gap-1.5 rounded px-2 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
        onClick={ctx.onToggleAi}
        type="button"
      >
        <Bot size={13} />
        AI
      </button>
    </div>
  )
}

// ─── Add-tab left actions ─────────────────────────────────────────────────────

function DockviewLeftActions({
  api: groupApi,
  containerApi,
}: IDockviewHeaderActionsProps) {
  const ctx = useSailorCtx()

  const addToGroup = (e: React.MouseEvent) => {
    e.stopPropagation()
    const n = ctx.nextTabNumber()
    containerApi.addPanel({
      id: `sql-${Date.now()}`,
      component: 'sql',
      tabComponent: 'sql-tab',
      title: `SQL ${n}`,
      position: { referenceGroup: groupApi.id, direction: 'within' },
    })
  }

  return (
    <div className="flex items-center pl-0.5">
      <button
        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={addToGroup}
        title="New SQL tab"
        type="button"
      >
        <Plus size={13} />
      </button>
    </div>
  )
}

// ─── AI chat message type ─────────────────────────────────────────────────────

interface SailorChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  response?: SailorAiResponse
}

// ─── SailorCard ─────────────────────────────────────────────────────────

export function SailorCard() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dockviewApiRef = useRef<DockviewApi | null>(null)
  const tabCounterRef = useRef(1)
  const activePanelApplyRef = useRef<((sql: string) => void) | null>(null)
  const nextTabNumber = useCallback(() => {
    tabCounterRef.current += 1
    return tabCounterRef.current
  }, [])
  const registerActivePanelApply = useCallback(
    (apply: (sql: string) => void) => {
      activePanelApplyRef.current = apply
    },
    [],
  )

  const datasets = useSailorStore((s) => s.datasets)
  const activeDatasetId = useSailorStore((s) => s.activeDatasetId)
  const addDataset = useSailorStore((s) => s.addDataset)
  const removeDataset = useSailorStore((s) => s.removeDataset)
  const setActiveDataset = useSailorStore((s) => s.setActiveDataset)
  const renameDatasetAction = useSailorStore((s) => s.renameDataset)

  const activeDataset = useMemo<StoredDataset | null>(
    () => datasets.find((d) => d.id === activeDatasetId) ?? null,
    [datasets, activeDatasetId],
  )

  const [isDragging, setIsDragging] = useState(false)
  const [isLoadingDataset, setIsLoadingDataset] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI drawer
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<SailorAiProviderId>(
    () => getStoredAiProvider(),
  )
  const [question, setQuestion] = useState('')
  const [chatMessages, setChatMessages] = useState<SailorChatMessage[]>([])
  const [modelsByProvider, setModelsByProvider] = useState<
    Partial<Record<SailorAiProviderId, SailorModel[]>>
  >({})
  const [selectedModelIds, setSelectedModelIds] = useState<
    Record<SailorAiProviderId, string>
  >(() => ({
    openrouter: getStoredModelId('openrouter'),
    webllm: getInitialWebLlmModelId(),
  }))
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [loadingModelsProvider, setLoadingModelsProvider] =
    useState<SailorAiProviderId | null>(null)
  const [isAskingAi, setIsAskingAi] = useState(false)
  const [aiProgressText, setAiProgressText] = useState<string | null>(null)
  const [isOpenRouterConnected, setIsOpenRouterConnected] = useState(() =>
    hasOpenRouterApiKey(),
  )
  const [manualOpenRouterKey, setManualOpenRouterKey] = useState('')
  const [isConnectingOpenRouter, setIsConnectingOpenRouter] = useState(false)

  // Re-register all stored datasets on (re)mount so DuckDB sees them.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-register only on mount; dataset changes are handled in add/rename paths.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      for (const dataset of datasets) {
        if (cancelled) return
        try {
          await ensureDatasetRegistered({
            datasetId: dataset.id,
            desiredTableName: dataset.displayName,
            fileName: dataset.fileName,
            bytes: dataset.bytes,
          })
        } catch (e) {
          console.error('Failed to re-register dataset', dataset.id, e)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only re-register; dataset changes handled in add/rename paths
  }, [])

  const models = useMemo(
    () => modelsByProvider[selectedProvider] ?? [],
    [modelsByProvider, selectedProvider],
  )
  const selectedModelId = selectedModelIds[selectedProvider]
  const isLoadingModels = loadingModelsProvider === selectedProvider
  const modelGroups = useMemo(() => groupModelsByOwner(models), [models])

  const loadAiModels = useCallback(
    (provider: SailorAiProviderId) => {
      if (provider === 'openrouter' && !hasOpenRouterApiKey()) {
        setModelsError(null)
        return
      }

      if (modelsByProvider[provider] || loadingModelsProvider === provider) {
        return
      }

      setLoadingModelsProvider(provider)
      setModelsError(null)

      void listSailorModels(provider)
        .then((nextModels) => {
          setModelsByProvider((current) => ({
            ...current,
            [provider]: nextModels,
          }))
          setSelectedModelIds((current) => {
            const storedModelId = current[provider]
            const hasStoredModel = nextModels.some(
              (model) => model.id === storedModelId,
            )
            const nextModelId = hasStoredModel
              ? storedModelId
              : (nextModels[0]?.id ?? '')

            if (nextModelId) setStoredModelId(provider, nextModelId)

            return {
              ...current,
              [provider]: nextModelId,
            }
          })
        })
        .catch((e) => {
          setModelsError(
            e instanceof Error ? e.message : t('sailor.errors.modelsFailed'),
          )
        })
        .finally(() => {
          setLoadingModelsProvider((current) =>
            current === provider ? null : current,
          )
        })
    },
    [loadingModelsProvider, modelsByProvider, t],
  )

  useEffect(() => {
    let cancelled = false

    void completeOpenRouterPkceAuthFromUrl()
      .then((completed) => {
        if (cancelled || !completed) return
        setIsOpenRouterConnected(true)
        loadAiModels('openrouter')
      })
      .catch((e) => {
        if (cancelled) return
        setModelsError(
          e instanceof Error
            ? e.message
            : t('sailor.errors.openRouterAuthFailed'),
        )
      })

    return () => {
      cancelled = true
    }
  }, [loadAiModels, t])

  const loadCsvBytes = async (args: {
    fileName: string
    bytes: Uint8Array
  }) => {
    setIsLoadingDataset(true)
    setError(null)

    try {
      const datasetId = `ds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const baseTableName = makeTableNameFromFileName(args.fileName)
      const existingNames = datasets.map((d) => d.displayName)
      const desiredTableName = makeUniqueTableName(baseTableName, existingNames)

      const connection = await ensureDatasetRegistered({
        datasetId,
        desiredTableName,
        fileName: args.fileName,
        bytes: args.bytes,
      })
      const profile = await buildSailorProfile({
        conn: connection.conn,
        tableName: desiredTableName,
      })
      addDataset({
        id: datasetId,
        fileName: args.fileName,
        displayName: desiredTableName,
        bytes: args.bytes,
        profile,
      })
      setChatMessages([])
      setQuestion('')
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t('sailor.errors.datasetFailed'),
      )
    } finally {
      setIsLoadingDataset(false)
    }
  }

  const loadCsvFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > maxFileBytes) {
      setError(
        t('sailor.errors.csvTooLarge', {
          limit: getFileSizeLabel(maxFileBytes),
        }),
      )
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError(t('sailor.errors.csvOnly'))
      return
    }
    await loadCsvBytes({
      fileName: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    await loadCsvFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void loadCsvFile(event.dataTransfer.files?.[0])
  }

  const handleDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    fileInputRef.current?.click()
  }

  const onDockviewReady = useCallback((event: DockviewReadyEvent) => {
    dockviewApiRef.current = event.api

    event.api.onWillShowOverlay((e) => {
      if (e.position === 'top' || e.position === 'bottom') {
        e.preventDefault()
      }
    })

    event.api.addPanel({
      id: `sql-${Date.now()}`,
      component: 'sql',
      tabComponent: 'sql-tab',
      title: `SQL ${tabCounterRef.current}`,
    })
  }, [])

  const handleRenameDataset = useCallback(
    async (id: string, nextName: string) => {
      const trimmed = nextName.trim()
      if (!trimmed) return
      const target = datasets.find((d) => d.id === id)
      if (!target || target.displayName === trimmed) return
      const collision = datasets.some(
        (d) => d.id !== id && d.displayName === trimmed,
      )
      if (collision) return
      renameDatasetAction(id, trimmed)
      try {
        await ensureDatasetRegistered({
          datasetId: id,
          desiredTableName: trimmed,
          fileName: target.fileName,
          bytes: target.bytes,
        })
      } catch (e) {
        console.error('Failed to rename dataset table', e)
      }
    },
    [datasets, renameDatasetAction],
  )

  const handleRemoveDataset = useCallback(
    (id: string) => {
      removeDataset(id)
      void import('./connectionRegistry').then((m) => m.unregisterDataset(id))
    },
    [removeDataset],
  )

  const askAi = async () => {
    if (!activeDataset || !selectedModelId) return
    if (selectedProvider === 'openrouter' && !isOpenRouterConnected) return
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) return

    const messageId = `${Date.now()}-${chatMessages.length}`
    setChatMessages((c) => [
      ...c,
      { id: `${messageId}-user`, role: 'user', text: trimmedQuestion },
    ])
    setQuestion('')
    setIsAskingAi(true)
    setAiProgressText(null)
    setError(null)

    try {
      const response = await askSailorAi(
        {
          provider: selectedProvider,
          question: trimmedQuestion,
          profile: activeDataset.profile,
          lastQuery: '',
          modelId: selectedModelId,
        },
        (progress) => {
          const percent = Math.round(progress.progress * 100)
          setAiProgressText(
            progress.text ? `${progress.text} (${percent}%)` : `${percent}%`,
          )
        },
      )
      setChatMessages((c) => [
        ...c,
        {
          id: `${messageId}-assistant`,
          role: 'assistant',
          text: response.answer,
          response,
        },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sailor.errors.aiFailed'))
    } finally {
      setIsAskingAi(false)
      setAiProgressText(null)
    }
  }

  const applySuggestion = (sql: string) => {
    activePanelApplyRef.current?.(sql)
  }

  const onToggleAi = useCallback(() => {
    setIsAiOpen((isOpen) => {
      if (!isOpen) loadAiModels(selectedProvider)

      return !isOpen
    })
  }, [loadAiModels, selectedProvider])

  const handleProviderChange = (provider: SailorAiProviderId) => {
    setSelectedProvider(provider)
    setStoredAiProvider(provider)
    setModelsError(null)
    loadAiModels(provider)
  }

  const handleModelChange = (modelId: string) => {
    setSelectedModelIds((current) => ({
      ...current,
      [selectedProvider]: modelId,
    }))
    setStoredModelId(selectedProvider, modelId)
  }

  const handleSaveManualOpenRouterKey = () => {
    try {
      storeOpenRouterApiKey(manualOpenRouterKey)
      setManualOpenRouterKey('')
      setIsOpenRouterConnected(true)
      setModelsByProvider((current) => ({ ...current, openrouter: undefined }))
      loadAiModels('openrouter')
    } catch (e) {
      setModelsError(
        e instanceof Error
          ? e.message
          : t('sailor.errors.openRouterAuthFailed'),
      )
    }
  }

  const handleForgetOpenRouterKey = () => {
    forgetOpenRouterApiKey()
    setIsOpenRouterConnected(false)
    setModelsByProvider((current) => ({ ...current, openrouter: undefined }))
    setSelectedModelIds((current) => ({ ...current, openrouter: '' }))
    setModelsError(null)
  }

  const handleConnectOpenRouter = () => {
    setIsConnectingOpenRouter(true)
    void startOpenRouterPkceAuth().catch((e) => {
      setIsConnectingOpenRouter(false)
      setModelsError(
        e instanceof Error
          ? e.message
          : t('sailor.errors.openRouterAuthFailed'),
      )
    })
  }

  const ctxValue = useMemo<SailorCtxValue>(
    () => ({
      nextTabNumber,
      dockviewApiRef,
      registerActivePanelApply,
      onToggleAi,
    }),
    [nextTabNumber, registerActivePanelApply, onToggleAi],
  )

  const isDark = document.documentElement.classList.contains('dark')
  const needsOpenRouterConnection =
    selectedProvider === 'openrouter' && !isOpenRouterConnected

  // ── dropzone ──────────────────────────────────────────────────────────────

  if (datasets.length === 0) {
    return (
      <section className="grid h-full min-h-[720px] place-items-center bg-background p-6">
        <input
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
          ref={fileInputRef}
          type="file"
        />
        {/* biome-ignore lint/a11y/useSemanticElements: This dropzone contains a nested button, so using a native button would create invalid interactive markup. */}
        <div
          className={`flex min-h-[360px] w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition ${
            isDragging
              ? 'border-foreground bg-muted'
              : 'border-border bg-muted/30 hover:bg-muted/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragging(false)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onKeyDown={handleDropzoneKeyDown}
          role="button"
          tabIndex={0}
        >
          <div className="mb-5 flex size-12 items-center justify-center rounded-md border border-border bg-background">
            {isLoadingDataset ? (
              <Loader2 className="animate-spin text-muted-foreground" />
            ) : (
              <FileUp className="text-muted-foreground" />
            )}
          </div>
          <p className="font-semibold text-base">{t('sailor.noData')}</p>
          <p className="mt-2 max-w-md text-muted-foreground text-sm leading-6">
            {t('sailor.dropCsv', {
              limit: getFileSizeLabel(maxFileBytes),
            })}
          </p>
          <Button
            className="mt-5"
            disabled={isLoadingDataset}
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            type="button"
          >
            {isLoadingDataset ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={17} />
            ) : (
              <Upload aria-hidden="true" size={17} />
            )}
            {t('sailor.uploadCsv')}
          </Button>
          {error ? (
            <p className="mt-4 text-destructive text-sm">{error}</p>
          ) : null}
        </div>
      </section>
    )
  }

  // ── main layout ───────────────────────────────────────────────────────────

  return (
    <SailorCtx.Provider value={ctxValue}>
      <section className="grid h-full min-h-[720px] grid-cols-[380px_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-background">
        <input
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
          ref={fileInputRef}
          type="file"
        />

        <DatasetOverviewPanel
          activeDataset={activeDataset ? toLegacyDataset(activeDataset) : null}
          datasets={datasets.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            displayName: d.displayName,
          }))}
          activeDatasetId={activeDatasetId}
          isLoadingDataset={isLoadingDataset}
          onUploadClick={() => fileInputRef.current?.click()}
          onSelectDataset={setActiveDataset}
          onRenameDataset={(id, name) => void handleRenameDataset(id, name)}
          onRemoveDataset={handleRemoveDataset}
        />

        <main className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
          <DockviewReact
            className="de-dock"
            components={{ sql: SqlWorkspacePanel }}
            leftHeaderActionsComponent={DockviewLeftActions}
            onReady={onDockviewReady}
            rightHeaderActionsComponent={DockviewRightActions}
            tabComponents={{ 'sql-tab': SqlTabHeader }}
            theme={isDark ? themeDark : themeLight}
            watermarkComponent={DockviewWatermark}
          />

          {/* AI drawer */}
          <aside
            className={`absolute inset-y-0 right-0 z-20 flex w-[360px] max-w-[calc(100%-24px)] flex-col border-border border-l bg-background shadow-2xl transition-transform duration-200 ${
              isAiOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-start gap-2 border-border border-b p-3">
              <div className="grid min-w-0 flex-1 gap-2">
                <label className="sr-only" htmlFor="provider-select">
                  {t('sailor.aiProvider')}
                </label>
                <select
                  className="h-9 min-w-0 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  disabled={isAskingAi}
                  id="provider-select"
                  onChange={(e) =>
                    handleProviderChange(e.target.value as SailorAiProviderId)
                  }
                  value={selectedProvider}
                >
                  <option value="openrouter">
                    {t('sailor.providers.openrouter')}
                  </option>
                  <option value="webllm">{t('sailor.providers.webllm')}</option>
                </select>

                {needsOpenRouterConnection ? (
                  <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-2">
                    <p className="text-muted-foreground text-xs leading-5">
                      {t('sailor.openRouterAuthHint')}
                    </p>
                    <Button
                      disabled={isConnectingOpenRouter}
                      onClick={handleConnectOpenRouter}
                      size="sm"
                      type="button"
                    >
                      {isConnectingOpenRouter ? (
                        <Loader2
                          aria-hidden="true"
                          className="animate-spin"
                          size={15}
                        />
                      ) : null}
                      {t('sailor.connectOpenRouter')}
                    </Button>
                    <div className="flex gap-2">
                      <input
                        className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
                        onChange={(e) => setManualOpenRouterKey(e.target.value)}
                        placeholder={t('sailor.pasteOpenRouterKey')}
                        type="password"
                        value={manualOpenRouterKey}
                      />
                      <Button
                        disabled={!manualOpenRouterKey.trim()}
                        onClick={handleSaveManualOpenRouterKey}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {t('sailor.saveKey')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedProvider === 'openrouter' ? (
                      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5">
                        <span className="truncate text-muted-foreground text-xs">
                          {t('sailor.openRouterConnected')}
                        </span>
                        <Button
                          onClick={handleForgetOpenRouterKey}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {t('sailor.forgetKey')}
                        </Button>
                      </div>
                    ) : null}
                    <label className="sr-only" htmlFor="model-select">
                      {t('sailor.aiModel')}
                    </label>
                    <select
                      className="h-9 min-w-0 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      disabled={isLoadingModels || models.length === 0}
                      id="model-select"
                      onChange={(e) => handleModelChange(e.target.value)}
                      value={selectedModelId}
                    >
                      {isLoadingModels ? (
                        <option>{t('sailor.loadingModels')}</option>
                      ) : null}
                      {!isLoadingModels && models.length === 0 ? (
                        <option>{t('sailor.noModels')}</option>
                      ) : null}
                      {modelGroups.map((group) => (
                        <optgroup key={group.owner} label={group.owner}>
                          {group.models.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </>
                )}
              </div>
              <Button
                onClick={() => setIsAiOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" size={16} />
                <span className="sr-only">{t('sailor.closeAi')}</span>
              </Button>
            </div>
            {modelsError ? (
              <p className="border-border border-b px-4 py-2 text-muted-foreground text-xs leading-5">
                {modelsError}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {chatMessages.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <Bot
                      aria-hidden="true"
                      className="mx-auto mb-3 text-muted-foreground"
                      size={22}
                    />
                    <p className="font-medium text-sm">
                      {t('sailor.startChat')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {chatMessages.map((message) => (
                    <div
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      key={message.id}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                          message.role === 'user'
                            ? 'rounded-br-md bg-foreground text-background'
                            : 'rounded-bl-md border border-border bg-muted/40 text-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.text}</p>

                        {message.response?.suggestedQueries.length ? (
                          <div className="mt-3 grid gap-2">
                            {message.response.suggestedQueries.map(
                              (suggestion) => (
                                <button
                                  className="rounded-md border border-border bg-background p-2 text-left text-foreground text-xs transition hover:bg-muted"
                                  key={suggestion.title}
                                  onClick={() =>
                                    applySuggestion(suggestion.sql)
                                  }
                                  type="button"
                                >
                                  <span className="font-semibold">
                                    {suggestion.title}
                                  </span>
                                  <span className="mt-1 block text-muted-foreground leading-5">
                                    {suggestion.reason}
                                  </span>
                                </button>
                              ),
                            )}
                          </div>
                        ) : null}

                        {message.response?.derivedFeatures.length ? (
                          <div className="mt-3 grid gap-2">
                            {message.response.derivedFeatures.map((feature) => (
                              <div
                                className="rounded-md border border-border bg-background p-2 text-xs"
                                key={feature.name}
                              >
                                <p className="font-semibold">{feature.name}</p>
                                <code className="mt-1 block whitespace-pre-wrap text-muted-foreground">
                                  {feature.sqlExpression}
                                </code>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {isAskingAi ? (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground text-sm">
                        <Loader2
                          aria-hidden="true"
                          className="animate-spin"
                          size={15}
                        />
                        {aiProgressText ?? t('sailor.thinking')}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-border border-t p-3">
              <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2">
                <textarea
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || e.shiftKey) return
                    e.preventDefault()
                    void askAi()
                  }}
                  rows={1}
                  value={question}
                />
                <Button
                  disabled={
                    needsOpenRouterConnection ||
                    !selectedModelId ||
                    isAskingAi ||
                    !question.trim()
                  }
                  onClick={() => void askAi()}
                  size="icon"
                  type="button"
                >
                  {isAskingAi ? (
                    <Loader2
                      aria-hidden="true"
                      className="animate-spin"
                      size={16}
                    />
                  ) : (
                    <Send aria-hidden="true" size={16} />
                  )}
                  <span className="sr-only">{t('sailor.sendQuestion')}</span>
                </Button>
              </div>
            </div>
          </aside>
        </main>
      </section>
    </SailorCtx.Provider>
  )
}
