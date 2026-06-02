/* eslint-disable react-hooks/static-components */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Icons } from '@/config/icons'
import { cn } from '@/lib/utils'
import type { CalculatedFieldSpec } from '../../chart-engine/calculatedFields'
import type { DatasetField, SemanticType } from '../../chart-engine/types'
import { CalculatedFieldPanel } from '../CalculatedFieldPanel'

interface CalculatedFieldInfo {
  name: string
  expression: string
  semanticType: SemanticType
}

interface FieldListProps {
  fields: DatasetField[]
  calculatedFields?: CalculatedFieldInfo[]
  /** Active Dataset name, surfaced as the field list header (biwave-06). */
  datasetName?: string
  onCreateCalculatedField?: (spec: CalculatedFieldSpec) => Promise<void> | void
  onEditCalculatedField?: (
    name: string,
    spec: CalculatedFieldSpec,
  ) => Promise<void> | void
  onDeleteCalculatedField?: (name: string) => void
  onFieldDoubleClick?: (field: DatasetField) => void
  disabled?: boolean
}

interface GroupedFields {
  dimensions: DatasetField[]
  measures: DatasetField[]
  calculated: DatasetField[]
}

function groupAndSortFields(
  fields: DatasetField[],
  calculatedFieldNames: Set<string>,
): GroupedFields {
  const dimensions: DatasetField[] = []
  const measures: DatasetField[] = []
  const calculated: DatasetField[] = []

  for (const field of fields) {
    if (calculatedFieldNames.has(field.name)) {
      calculated.push(field)
    } else if (field.semanticType === 'quantitative') {
      measures.push(field)
    } else {
      dimensions.push(field)
    }
  }

  const sortByName = (a: DatasetField, b: DatasetField) =>
    a.name.localeCompare(b.name)

  return {
    dimensions: dimensions.sort(sortByName),
    measures: measures.sort(sortByName),
    calculated: calculated.sort(sortByName),
  }
}

interface FieldPillProps {
  field: DatasetField
  isCalculated?: boolean
  calculatedExpression?: string
  onEdit?: () => void
  onDelete?: () => void
  onDoubleClick?: () => void
}

function getFieldIcon(field: DatasetField) {
  const duckdbType = field.duckdbType.toLowerCase()
  if (field.semanticType === 'temporal') return Icons.featuredate
  if (field.semanticType === 'quantitative') return Icons.featurenumerical
  if (duckdbType.includes('bool')) return Icons.featureboolean
  return Icons.featurestring
}

function FieldPill({
  field,
  isCalculated,
  calculatedExpression,
  onEdit,
  onDelete,
  onDoubleClick,
}: FieldPillProps) {
  const { t } = useTranslation()
  const Icon = isCalculated ? Icons.calculatedFieldAdd : getFieldIcon(field)

  const content = (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', field.name)
        e.dataTransfer.setData('application/x-field-type', field.semanticType)
        e.dataTransfer.effectAllowed = 'copy'
        window.dispatchEvent(
          new CustomEvent('reports:field-drag-start', {
            detail: {
              name: field.name,
              semanticType: field.semanticType,
            },
          }),
        )
      }}
      onDragEnd={() => {
        window.dispatchEvent(new Event('reports:field-drag-end'))
      }}
      onDoubleClick={onDoubleClick}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onDoubleClick) {
          event.preventDefault()
          onDoubleClick()
        }
      }}
      className={cn(
        buttonVariants({ variant: 'default' }),
        'group flex h-6 w-full items-center justify-start gap-1.5 rounded-full px-1.5 py-0.5 text-xs',
        'cursor-grab active:cursor-grabbing truncate',
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70" />
      <span className="min-w-0 flex-1 truncate text-left">{field.name}</span>

      {isCalculated && (onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Icons.menu className="h-3 w-3" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Icons.edit className="h-3 w-3 mr-2" />
                <span className="text-xs">{t('fields.edit', 'Edit')}</span>
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Icons.delete className="h-3 w-3 mr-2" />
                <span className="text-xs">{t('fields.delete', 'Delete')}</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </button>
  )

  if (isCalculated && calculatedExpression) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] break-all text-xs">
          {field.name}: {calculatedExpression}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

interface FieldGroupProps {
  title: string
  fields: DatasetField[]
  defaultOpen?: boolean
  icon: React.ReactNode
  accentClass: string
  calculatedFields?: Map<string, CalculatedFieldInfo>
  onEditField?: (name: string) => void
  onDeleteField?: (name: string) => void
  onFieldDoubleClick?: (field: DatasetField) => void
}

function FieldGroup({
  title,
  fields,
  defaultOpen = true,
  icon,
  accentClass,
  calculatedFields,
  onEditField,
  onDeleteField,
  onFieldDoubleClick,
}: FieldGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (fields.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors justify-start text-left">
        {isOpen ? (
          <Icons.chevronDown className="h-3 w-3" />
        ) : (
          <Icons.chevronRight className="h-3 w-3" />
        )}
        <span className={cn('flex items-center gap-1', accentClass)}>
          {icon}
          {title}
        </span>
        <span className="ml-auto text-[10px] tabular-nums opacity-60">
          {fields.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-1 pl-4 pt-0.5">
          {fields.map((f) => {
            const calcInfo = calculatedFields?.get(f.name)
            return (
              <FieldPill
                key={f.name}
                field={f}
                isCalculated={!!calcInfo}
                calculatedExpression={calcInfo?.expression}
                onEdit={
                  calcInfo && onEditField
                    ? () => onEditField(f.name)
                    : undefined
                }
                onDelete={
                  calcInfo && onDeleteField
                    ? () => onDeleteField(f.name)
                    : undefined
                }
                onDoubleClick={
                  onFieldDoubleClick ? () => onFieldDoubleClick(f) : undefined
                }
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function FieldList({
  fields,
  calculatedFields = [],
  datasetName,
  onCreateCalculatedField,
  onEditCalculatedField,
  onDeleteCalculatedField,
  onFieldDoubleClick,
  disabled,
}: FieldListProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [isCreatingField, setIsCreatingField] = useState(false)
  const [editingField, setEditingField] = useState<CalculatedFieldInfo | null>(
    null,
  )
  const calculatedFieldMap = useMemo(() => {
    const map = new Map<string, CalculatedFieldInfo>()
    for (const cf of calculatedFields) {
      map.set(cf.name, cf)
    }
    return map
  }, [calculatedFields])

  const calculatedFieldNames = useMemo(
    () => new Set(calculatedFields.map((cf) => cf.name)),
    [calculatedFields],
  )

  const availableExpressionFields = useMemo(() => {
    return fields
      .filter((f) => !calculatedFieldNames.has(f.name))
      .map((f) => f.name)
  }, [fields, calculatedFieldNames])

  const filteredFields = useMemo(() => {
    if (!search.trim()) return fields
    const query = search.toLowerCase()
    return fields.filter((f) => f.name.toLowerCase().includes(query))
  }, [fields, search])

  const grouped = useMemo(
    () => groupAndSortFields(filteredFields, calculatedFieldNames),
    [filteredFields, calculatedFieldNames],
  )

  const handleEditField = (name: string) => {
    const field = calculatedFieldMap.get(name)
    if (field) {
      setIsCreatingField(false)
      setEditingField(field)
    }
  }

  const handleEditSave = async (spec: CalculatedFieldSpec) => {
    if (editingField && onEditCalculatedField) {
      await onEditCalculatedField(editingField.name, spec)
      setEditingField(null)
    }
  }

  const handleCreateSave = async (spec: CalculatedFieldSpec) => {
    if (onCreateCalculatedField) {
      await onCreateCalculatedField(spec)
      setIsCreatingField(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      {datasetName ? (
        <div
          className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          title={datasetName}
        >
          {datasetName}
        </div>
      ) : null}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 min-w-0">
          <Icons.search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('fields.search', 'Search...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-7 text-xs"
            disabled={disabled}
          />
        </div>
        {onCreateCalculatedField && (
          <Button
            aria-label={t('calculated.add', 'Calculated')}
            className="h-7 w-7"
            disabled={disabled}
            onClick={() => {
              setEditingField(null)
              setIsCreatingField((current) => !current)
            }}
            size="icon"
            type="button"
            variant={isCreatingField ? 'primary' : 'outline'}
          >
            <Icons.calculatedFieldAdd className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isCreatingField && (
        <CalculatedFieldPanel
          availableFields={availableExpressionFields}
          disabled={disabled}
          onCancel={() => setIsCreatingField(false)}
          onSubmit={handleCreateSave}
        />
      )}

      {editingField && (
        <CalculatedFieldPanel
          availableFields={availableExpressionFields}
          disabled={disabled}
          initialExpression={editingField.expression}
          initialName={editingField.name}
          isEditing
          key={editingField.name}
          onCancel={() => setEditingField(null)}
          onSubmit={handleEditSave}
        />
      )}

      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="flex flex-col gap-1.5">
          <FieldGroup
            title={t('fields.dimensions', 'Dimensions')}
            fields={grouped.dimensions}
            icon={<Icons.Dimensions className="h-3 w-3" />}
            accentClass="text-muted-foreground"
            onFieldDoubleClick={onFieldDoubleClick}
          />
          <FieldGroup
            title={t('fields.measures', 'Measures')}
            fields={grouped.measures}
            icon={<Icons.Measures className="h-3 w-3" />}
            accentClass="text-muted-foreground"
            onFieldDoubleClick={onFieldDoubleClick}
          />
          {grouped.calculated.length > 0 && (
            <FieldGroup
              title={t('fields.calculated', 'Calculated')}
              fields={grouped.calculated}
              icon={<Icons.calculatedFieldAdd className="h-3 w-3" />}
              accentClass="text-muted-foreground"
              calculatedFields={calculatedFieldMap}
              onEditField={onEditCalculatedField ? handleEditField : undefined}
              onDeleteField={onDeleteCalculatedField}
              onFieldDoubleClick={onFieldDoubleClick}
            />
          )}

          {filteredFields.length === 0 && (
            <div className="text-xs text-muted-foreground py-4 text-center">
              {search
                ? t('fields.noResults', 'No fields match your search')
                : t('fields.empty', 'No fields')}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
