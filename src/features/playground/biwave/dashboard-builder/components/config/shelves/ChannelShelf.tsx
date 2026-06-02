/* eslint-disable react-hooks/static-components */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Icons } from '@/config/icons'
import { cn } from '@/lib/utils'
import type {
  ChannelDefinition,
  EncodedFieldValue,
} from '../../../chart-engine/configs/types'
import type {
  Aggregation,
  DatasetField,
  SemanticType,
} from '../../../chart-engine/types'

interface ChannelShelfProps {
  channel: ChannelDefinition
  fields: DatasetField[]
  value: EncodedFieldValue[]
  onChange: (fields: EncodedFieldValue[]) => void
  onAdd: (field: EncodedFieldValue) => void
  onRemove: (fieldName: string) => void
  disabled?: boolean
}

interface FieldPillProps {
  field: EncodedFieldValue
  onRemove: () => void
  onAggregationChange?: (aggregation: Aggregation) => void
  disabled?: boolean
}

const AGG_OPTIONS: Aggregation[] = ['sum', 'avg', 'min', 'max', 'median']

function getEncodedFieldIcon(field: EncodedFieldValue) {
  if (field.semanticType === 'quantitative') return Icons.featurenumerical
  if (field.semanticType === 'temporal') return Icons.featuredate
  return Icons.featurestring
}

function FieldPill({
  field,
  onRemove,
  onAggregationChange,
  disabled,
}: FieldPillProps) {
  const isMeasure = field.semanticType === 'quantitative'
  const aggregationLabel = (field.aggregation || 'sum').toUpperCase()
  const Icon = getEncodedFieldIcon(field)

  return (
    <div
      className={cn(
        buttonVariants({ variant: 'primary' }),
        'group flex h-6 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs',
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" />
      <span className="truncate">{field.name}</span>

      {isMeasure && onAggregationChange && !disabled && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 inline-flex items-center gap-1 text-[10px] opacity-70 hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {aggregationLabel}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-28"
          >
            {AGG_OPTIONS.map((agg) => (
              <DropdownMenuItem
                key={agg}
                className="text-xs"
                onClick={() => onAggregationChange(agg)}
              >
                {agg.toUpperCase()}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
        >
          <Icons.close className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

interface DropZoneProps {
  channel: ChannelDefinition
  onDrop: (field: EncodedFieldValue) => void
  disabled: boolean
  isEmpty: boolean
}

function DropZone({
  channel,
  onDrop,
  disabled,
  isEmpty,
  fields,
}: DropZoneProps & { fields: DatasetField[] }) {
  const { t } = useTranslation()
  const [dragState, setDragState] = useState<'valid' | 'invalid' | null>(null)
  const [isGlobalDrag, setIsGlobalDrag] = useState(false)

  const acceptsType = useCallback(
    (fieldName: string | null, fallbackType: string | null) => {
      if (!fieldName) return 'invalid' as const
      const semanticType =
        fields.find((f) => f.name === fieldName)?.semanticType ??
        (fallbackType as SemanticType | null)
      if (!semanticType) return 'invalid' as const

      if (channel.accepts === 'any') return 'valid' as const
      const isMeasure = semanticType === 'quantitative'
      const acceptsMeasure = channel.accepts === 'measure'
      return isMeasure === acceptsMeasure
        ? ('valid' as const)
        : ('invalid' as const)
    },
    [channel.accepts, fields],
  )

  useEffect(() => {
    if (disabled) return

    const handleDragStart = (event: Event) => {
      const custom = event as CustomEvent<{
        name?: string
        semanticType?: SemanticType
      }>
      const fieldName = custom.detail?.name ?? null
      const semanticType = custom.detail?.semanticType ?? null
      setIsGlobalDrag(true)
      setDragState(acceptsType(fieldName, semanticType))
    }

    const handleDragEnd = () => {
      setIsGlobalDrag(false)
      setDragState(null)
    }

    window.addEventListener(
      'reports:field-drag-start',
      handleDragStart as EventListener,
    )
    window.addEventListener('reports:field-drag-end', handleDragEnd)
    return () => {
      window.removeEventListener(
        'reports:field-drag-start',
        handleDragStart as EventListener,
      )
      window.removeEventListener('reports:field-drag-end', handleDragEnd)
    }
  }, [acceptsType, disabled])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      let fieldName = ''
      let fallbackType: string | null = null
      try {
        fieldName = e.dataTransfer.getData('text/plain')
        fallbackType =
          e.dataTransfer.getData('application/x-field-type') || null
      } catch {
        // Some browsers restrict custom drag data in specific drag states.
      }

      const nextState = fieldName ? acceptsType(fieldName, fallbackType) : null
      setDragState(nextState)

      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    [acceptsType, disabled],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      setDragState(null)

      const fieldName = e.dataTransfer.getData('text/plain')
      const fallbackType =
        e.dataTransfer.getData('application/x-field-type') || null

      if (!fieldName) return
      if (acceptsType(fieldName, fallbackType) !== 'valid') return

      const semanticType =
        fields.find((f) => f.name === fieldName)?.semanticType ??
        (fallbackType as SemanticType | null)
      if (!semanticType) return

      const newField: EncodedFieldValue = {
        name: fieldName,
        semanticType,
        aggregation: channel.defaultAggregation,
      }

      onDrop(newField)
    },
    [acceptsType, channel.defaultAggregation, disabled, fields, onDrop],
  )

  return (
    <button
      type="button"
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={() => {
        if (!isGlobalDrag) setDragState(null)
      }}
      onDrop={handleDrop}
      className={cn(
        'min-h-[28px] rounded border-2 border-dashed transition-colors',
        'flex items-center justify-center px-1.5 py-0.5',
        disabled
          ? 'border-muted bg-muted/30 cursor-not-allowed'
          : 'border-muted-foreground/20 hover:border-muted-foreground/40 cursor-pointer',
        dragState === 'valid' &&
          'border-success/70 bg-success/10 text-success-foreground',
        dragState === 'invalid' &&
          'border-destructive/70 bg-destructive/10 text-destructive',
        isEmpty && 'text-muted-foreground text-xs',
      )}
    >
      {isEmpty && (
        <span className="text-[10px]">
          {t(channel.placeholderKey, 'Drop field here')}
        </span>
      )}
    </button>
  )
}

export function ChannelShelf({
  channel,
  fields,
  value,
  onChange,
  onAdd,
  onRemove,
  disabled = false,
}: ChannelShelfProps) {
  const { t } = useTranslation()

  const isSingleLike = channel.cardinality !== 'multiple'
  const normalizedValue = isSingleLike ? value.slice(0, 1) : value
  const isEmpty = normalizedValue.length === 0
  const canAddMore = !isSingleLike || isEmpty

  useEffect(() => {
    if (!isSingleLike || value.length <= 1) return
    onChange(value.slice(0, 1))
  }, [isSingleLike, onChange, value])

  const handleAggregationChange = useCallback(
    (fieldName: string, aggregation: Aggregation) => {
      const next = normalizedValue.map((f) =>
        f.name === fieldName ? { ...f, aggregation } : f,
      )
      onChange(next)
    },
    [normalizedValue, onChange],
  )

  const handleDrop = useCallback(
    (field: EncodedFieldValue) => {
      if (isSingleLike) {
        onChange([field])
      } else {
        onAdd(field)
      }
    },
    [isSingleLike, onChange, onAdd],
  )

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <Label className="text-xs font-medium">
          {t(channel.labelKey, channel.id)}
          {channel.required && (
            <span className="text-destructive ml-0.5">*</span>
          )}
        </Label>
      </div>

      {normalizedValue.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {normalizedValue.map((field) => (
            <FieldPill
              key={field.name}
              field={field}
              onRemove={() => onRemove(field.name)}
              onAggregationChange={
                channel.allowAggregation !== false &&
                field.semanticType === 'quantitative'
                  ? (agg) => handleAggregationChange(field.name, agg)
                  : undefined
              }
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {canAddMore && (
        <DropZone
          channel={channel}
          onDrop={handleDrop}
          disabled={disabled}
          isEmpty={isEmpty}
          fields={fields}
        />
      )}
    </div>
  )
}
