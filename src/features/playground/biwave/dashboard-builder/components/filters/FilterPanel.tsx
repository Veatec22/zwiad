import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  selectSelectedWidget,
  useDashboardStore,
  type Dataset,
} from '../../chart-engine/store'
import type { FilterRule } from '../../chart-engine/types'
import { TableauFilterValueEditor } from './TableauFilterValueEditor'

type Scope = 'widget' | 'tab' | 'dashboard'

type QueryFn = (sql: string) => Promise<Array<Record<string, unknown>>>

interface ScopeSectionProps {
  scope: Scope
  title: string
  rules: FilterRule[]
  datasets: Dataset[]
  /** For widget scope, the dataset is locked to this id. */
  lockedDatasetId?: string
  onAdd: (rule: Omit<FilterRule, 'id'>) => void
  onUpdate: (id: string, rule: Partial<FilterRule>) => void
  onRemove: (id: string) => void
  query: QueryFn
  datasetActiveTable: (datasetId: string) => string
  disabled?: boolean
}

interface DraftRule {
  /** null while a new draft is being prepared (not yet saved). */
  id: string | null
  /** Full working rule (datasetId, fieldName, operator, value, enabled, …). */
  rule: FilterRule
}

function ScopeSection({
  scope,
  title,
  rules,
  datasets,
  lockedDatasetId,
  onAdd,
  onUpdate,
  onRemove,
  query,
  datasetActiveTable,
  disabled,
}: ScopeSectionProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const [draft, setDraft] = useState<DraftRule | null>(null)

  const datasetById = useMemo(() => {
    const map = new Map<string, Dataset>()
    for (const d of datasets) map.set(d.id, d)
    return map
  }, [datasets])

  const draftDataset = draft
    ? (datasetById.get(draft.rule.datasetId ?? '') ?? null)
    : null

  const startAdd = () => {
    const datasetId = lockedDatasetId ?? datasets[0]?.id ?? ''
    if (!datasetId) return
    setDraft({
      id: null,
      rule: {
        id: '',
        datasetId,
        fieldName: '',
        semanticType: 'nominal',
        operator: 'eq',
        value: null,
        enabled: true,
      },
    })
  }

  const startEdit = (rule: FilterRule) => {
    setDraft({
      id: rule.id,
      rule: {
        ...rule,
        datasetId: rule.datasetId ?? lockedDatasetId ?? datasets[0]?.id ?? '',
      },
    })
  }

  const cancelDraft = () => setDraft(null)

  const patchDraft = (patch: Partial<FilterRule>) => {
    setDraft((current) =>
      current ? { ...current, rule: { ...current.rule, ...patch } } : current,
    )
  }

  const onDatasetSelected = (datasetId: string) => {
    // Switching dataset invalidates fieldName/value.
    patchDraft({ datasetId, fieldName: '', value: null })
  }

  const onFieldSelected = (fieldName: string) => {
    const semantic =
      datasetById
        .get(draft?.rule.datasetId ?? '')
        ?.fields.find((f) => f.name === fieldName)?.semanticType ?? 'nominal'
    patchDraft({
      fieldName,
      semanticType: semantic,
      operator: 'eq',
      value: null,
    })
  }

  const saveDraft = () => {
    if (!draft) return
    const rule = draft.rule
    if (!rule.datasetId || !rule.fieldName) return
    if (draft.id) {
      onUpdate(draft.id, {
        datasetId: rule.datasetId,
        fieldName: rule.fieldName,
        semanticType: rule.semanticType,
        operator: rule.operator,
        value: rule.value,
        enabled: rule.enabled,
      })
    } else {
      onAdd({
        datasetId: rule.datasetId,
        fieldName: rule.fieldName,
        semanticType: rule.semanticType,
        operator: rule.operator,
        value: rule.value,
        enabled: rule.enabled,
      })
    }
    setDraft(null)
  }

  return (
    <div className="border-border border-b">
      <button
        className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/40"
        onClick={() => setExpanded((v) => !v)}
        type="button"
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform duration-200 ease-out ${
            expanded ? 'rotate-90' : ''
          }`}
        />
        <span className="flex-1 truncate">{title}</span>
        <span className="text-[10px] font-normal normal-case text-muted-foreground/70">
          {rules.length}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          expanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'pointer-events-none grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-1 px-2 pb-2">
            {scope === 'widget' && !lockedDatasetId ? (
              <p className="py-2 text-center text-[10px] text-muted-foreground">
                {t(
                  'filter.noSelectedWidget',
                  'Select a widget to manage its filters.',
                )}
              </p>
            ) : null}

            {(scope !== 'widget' || lockedDatasetId) &&
            rules.length === 0 &&
            !draft ? (
              <p className="py-2 text-center text-[10px] text-muted-foreground">
                {t('filter.empty', 'No filters in this scope.')}
              </p>
            ) : null}

            {rules.map((rule) => {
              const dataset = datasetById.get(rule.datasetId ?? '')
              const isEditing = draft?.id === rule.id
              if (isEditing) {
                return (
                  <div
                    key={rule.id}
                    className="rounded-sm border border-border bg-muted/30 p-2"
                  >
                    <DraftEditor
                      scope={scope}
                      lockedDatasetId={lockedDatasetId}
                      datasets={datasets}
                      draft={draft}
                      draftDataset={draftDataset}
                      onDatasetChange={onDatasetSelected}
                      onFieldChange={onFieldSelected}
                      onRulePatch={patchDraft}
                      onSave={saveDraft}
                      onCancel={cancelDraft}
                      disabled={disabled}
                      saveLabel={t('common.save', 'Save')}
                      query={query}
                      datasetActiveTable={datasetActiveTable}
                    />
                  </div>
                )
              }
              return (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  datasetName={dataset?.name}
                  onEdit={() => startEdit(rule)}
                  onToggle={(enabled) => onUpdate(rule.id, { enabled })}
                  onRemove={() => onRemove(rule.id)}
                  disabled={disabled}
                />
              )
            })}

            {/* New draft (not editing an existing rule) */}
            {draft && draft.id === null ? (
              <div className="rounded-sm border border-border bg-muted/30 p-2">
                <DraftEditor
                  scope={scope}
                  lockedDatasetId={lockedDatasetId}
                  datasets={datasets}
                  draft={draft}
                  draftDataset={draftDataset}
                  onDatasetChange={onDatasetSelected}
                  onFieldChange={onFieldSelected}
                  onRulePatch={patchDraft}
                  onSave={saveDraft}
                  onCancel={cancelDraft}
                  disabled={disabled}
                  saveLabel={t('common.add', 'Add')}
                  query={query}
                  datasetActiveTable={datasetActiveTable}
                />
              </div>
            ) : null}

            {(scope !== 'widget' || lockedDatasetId) && !draft ? (
              <button
                className="flex w-full items-center justify-center gap-1 rounded-sm border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                disabled={disabled || datasets.length === 0}
                onClick={startAdd}
                type="button"
              >
                <Plus className="h-3 w-3" />
                {t('filter.add', 'Add filter')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function DraftEditor({
  scope,
  lockedDatasetId,
  datasets,
  draft,
  draftDataset,
  onDatasetChange,
  onFieldChange,
  onRulePatch,
  onSave,
  onCancel,
  disabled,
  saveLabel,
  query,
  datasetActiveTable,
}: {
  scope: Scope
  lockedDatasetId?: string
  datasets: Dataset[]
  draft: DraftRule
  draftDataset: Dataset | null
  onDatasetChange: (id: string) => void
  onFieldChange: (name: string) => void
  onRulePatch: (patch: Partial<FilterRule>) => void
  onSave: () => void
  onCancel: () => void
  disabled?: boolean
  saveLabel: string
  query: QueryFn
  datasetActiveTable: (datasetId: string) => string
}) {
  const { t } = useTranslation()
  const canSave = Boolean(draft.rule.datasetId) && Boolean(draft.rule.fieldName)

  return (
    <>
      <DraftHeader
        scope={scope}
        lockedDatasetId={lockedDatasetId}
        datasets={datasets}
        datasetId={draft.rule.datasetId ?? ''}
        fieldName={draft.rule.fieldName}
        onDatasetChange={onDatasetChange}
        onFieldChange={onFieldChange}
      />
      {draftDataset && draft.rule.fieldName
        ? (() => {
            const field = draftDataset.fields.find(
              (f) => f.name === draft.rule.fieldName,
            )
            if (!field) return null
            return (
              <div className="mt-2">
                <TableauFilterValueEditor
                  rule={draft.rule}
                  field={field}
                  tableName={datasetActiveTable(draftDataset.id)}
                  query={query}
                  onChange={onRulePatch}
                  disabled={disabled}
                />
              </div>
            )
          })()
        : null}
      <div className="mt-2 flex justify-end gap-1">
        <button
          className="rounded-sm border border-border bg-background px-2 py-1 text-[10px] hover:bg-muted"
          onClick={onCancel}
          type="button"
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          className="rounded-sm border border-foreground bg-foreground px-2 py-1 text-[10px] text-background hover:opacity-90 disabled:opacity-40"
          disabled={!canSave || disabled}
          onClick={onSave}
          type="button"
        >
          {saveLabel}
        </button>
      </div>
    </>
  )
}

function DraftHeader({
  scope,
  lockedDatasetId,
  datasets,
  datasetId,
  fieldName,
  onDatasetChange,
  onFieldChange,
}: {
  scope: Scope
  lockedDatasetId?: string
  datasets: Dataset[]
  datasetId: string
  fieldName: string
  onDatasetChange: (id: string) => void
  onFieldChange: (name: string) => void
}) {
  const { t } = useTranslation()
  const dataset = datasets.find((d) => d.id === datasetId) ?? null

  return (
    <div className="space-y-1">
      <div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
          {t('filter.dataset', 'Dataset')}
        </div>
        {scope === 'widget' || lockedDatasetId ? (
          <div className="truncate text-[11px]">
            {dataset?.name ?? datasetId}
          </div>
        ) : (
          <Select
            value={datasetId}
            onValueChange={onDatasetChange}
            disabled={datasets.length === 0}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue placeholder="dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-[11px]">
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
          {t('filter.field', 'Field')}
        </div>
        <Select
          value={fieldName}
          onValueChange={onFieldChange}
          disabled={!dataset}
        >
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue placeholder="field" />
          </SelectTrigger>
          <SelectContent>
            {dataset?.fields.map((f) => (
              <SelectItem key={f.name} value={f.name} className="text-[11px]">
                {f.name}
              </SelectItem>
            )) ?? null}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function RuleRow({
  rule,
  datasetName,
  onEdit,
  onToggle,
  onRemove,
  disabled,
}: {
  rule: FilterRule
  datasetName?: string
  onEdit: () => void
  onToggle: (enabled: boolean) => void
  onRemove: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[11px] ${
        rule.enabled ? 'bg-background' : 'bg-muted/40 text-muted-foreground'
      }`}
    >
      <Checkbox
        aria-label="Enabled"
        checked={rule.enabled}
        disabled={disabled}
        onCheckedChange={(checked) => onToggle(checked === true)}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{rule.fieldName}</div>
        <div className="truncate text-[9px] text-muted-foreground">
          {datasetName ? `${datasetName} · ` : ''}
          {rule.operator}
          {formatValueSummary(rule.value)}
        </div>
      </div>
      <button
        aria-label="Edit"
        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
        disabled={disabled}
        onClick={onEdit}
        type="button"
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        aria-label="Remove"
        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        disabled={disabled}
        onClick={onRemove}
        type="button"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}

function formatValueSummary(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (Array.isArray(value)) return ` ${value.join(', ')}`
  return ` ${String(value)}`
}

interface FilterPanelProps {
  disabled?: boolean
  query: QueryFn
  datasetActiveTable: (datasetId: string) => string
}

export function FilterPanel({
  disabled,
  query,
  datasetActiveTable,
}: FilterPanelProps) {
  const { t } = useTranslation()
  const datasets = useDashboardStore((state) => state.datasets)
  const selectedWidget = useDashboardStore(selectSelectedWidget)
  const dashboardFilters = useDashboardStore((state) => state.dashboardFilters)
  const tabs = useDashboardStore((state) => state.tabs)
  const activeTabId = useDashboardStore((state) => state.activeTabId)
  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  )
  const tabFilters = activeTab?.filters ?? []

  const {
    addDashboardFilter,
    updateDashboardFilter,
    removeDashboardFilter,
    addTabFilter,
    updateTabFilter,
    removeTabFilter,
    updateWidget,
  } = useDashboardStore()

  const widgetFilters = selectedWidget?.filters ?? []

  // --- Widget scope handlers (write through updateWidget into widget.filters)
  const addWidgetFilter = (rule: Omit<FilterRule, 'id'>) => {
    if (!selectedWidget) return
    const next: FilterRule = {
      ...rule,
      id: `filter_${Math.random().toString(36).slice(2, 9)}`,
    }
    updateWidget(selectedWidget.id, {
      filters: [...selectedWidget.filters, next],
    })
  }
  const updateWidgetFilter = (id: string, updates: Partial<FilterRule>) => {
    if (!selectedWidget) return
    updateWidget(selectedWidget.id, {
      filters: selectedWidget.filters.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    })
  }
  const removeWidgetFilter = (id: string) => {
    if (!selectedWidget) return
    updateWidget(selectedWidget.id, {
      filters: selectedWidget.filters.filter((r) => r.id !== id),
    })
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <ScopeSection
        scope="widget"
        title={t('filter.scope.widget', 'Selected widget')}
        rules={widgetFilters}
        datasets={datasets}
        lockedDatasetId={selectedWidget?.datasetId}
        onAdd={addWidgetFilter}
        onUpdate={updateWidgetFilter}
        onRemove={removeWidgetFilter}
        query={query}
        datasetActiveTable={datasetActiveTable}
        disabled={
          disabled || !selectedWidget || selectedWidget.type !== 'chart'
        }
      />
      <ScopeSection
        scope="tab"
        title={t('filter.scope.tab', 'Active tab')}
        rules={tabFilters}
        datasets={datasets}
        onAdd={(rule) => activeTabId && addTabFilter(activeTabId, rule)}
        onUpdate={(id, updates) =>
          activeTabId && updateTabFilter(activeTabId, id, updates)
        }
        onRemove={(id) => activeTabId && removeTabFilter(activeTabId, id)}
        query={query}
        datasetActiveTable={datasetActiveTable}
        disabled={disabled || !activeTabId}
      />
      <ScopeSection
        scope="dashboard"
        title={t('filter.scope.dashboard', 'Dashboard')}
        rules={dashboardFilters}
        datasets={datasets}
        onAdd={addDashboardFilter}
        onUpdate={updateDashboardFilter}
        onRemove={removeDashboardFilter}
        query={query}
        datasetActiveTable={datasetActiveTable}
        disabled={disabled}
      />
    </div>
  )
}
