import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type {
  DatasetField,
  FilterOperator,
  FilterRule,
  SemanticType,
} from '../../chart-engine/types'

const operatorsByType: Record<SemanticType, FilterOperator[]> = {
  quantitative: [
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'between',
    'isNull',
    'isNotNull',
  ],
  temporal: [
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'between',
    'isNull',
    'isNotNull',
  ],
  nominal: [
    'eq',
    'neq',
    'in',
    'notIn',
    'contains',
    'notContains',
    'isNull',
    'isNotNull',
  ],
  ordinal: [
    'eq',
    'neq',
    'in',
    'notIn',
    'gt',
    'gte',
    'lt',
    'lte',
    'isNull',
    'isNotNull',
  ],
}

const operatorLabels: Record<FilterOperator, string> = {
  eq: 'filter.operators.eq',
  neq: 'filter.operators.neq',
  gt: 'filter.operators.gt',
  gte: 'filter.operators.gte',
  lt: 'filter.operators.lt',
  lte: 'filter.operators.lte',
  in: 'filter.operators.in',
  notIn: 'filter.operators.notIn',
  contains: 'filter.operators.contains',
  notContains: 'filter.operators.notContains',
  startsWith: 'filter.operators.startsWith',
  endsWith: 'filter.operators.endsWith',
  between: 'filter.operators.between',
  isNull: 'filter.operators.isNull',
  isNotNull: 'filter.operators.isNotNull',
}

function parseTypedValue(semanticType: SemanticType, raw: string): unknown {
  if (semanticType === 'quantitative') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  return raw
}

export function FilterRuleEditor({
  rule,
  fields,
  onChange,
  disabled = false,
  compact = false,
}: {
  rule: FilterRule
  fields: DatasetField[]
  onChange: (next: FilterRule) => void
  disabled?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()

  const field = useMemo(
    () => fields.find((f) => f.name === rule.fieldName) ?? null,
    [fields, rule.fieldName],
  )
  const semanticType = field?.semanticType ?? rule.semanticType ?? 'nominal'
  const availableOperators =
    operatorsByType[semanticType] ?? operatorsByType.nominal

  const needsValue = !['isNull', 'isNotNull'].includes(rule.operator)
  const needsTwoValues = rule.operator === 'between'
  const needsList = rule.operator === 'in' || rule.operator === 'notIn'

  const setFieldName = (fieldName: string) => {
    const nextField = fields.find((f) => f.name === fieldName)
    onChange({
      ...rule,
      fieldName,
      semanticType: nextField?.semanticType ?? 'nominal',
      operator: 'eq',
      value: null,
    })
  }

  const setOperator = (operator: FilterOperator) => {
    onChange({
      ...rule,
      operator,
      value: operator === 'between' ? ['', ''] : null,
    })
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t('filter.enabled', 'Enabled')}</Label>
        <Switch
          checked={rule.enabled}
          onCheckedChange={(enabled) => onChange({ ...rule, enabled })}
          className="scale-75 origin-right"
          disabled={disabled}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t('filter.field', 'Field')}</Label>
        <Select
          value={rule.fieldName}
          onValueChange={setFieldName}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue
              placeholder={t('filter.selectField', 'Select field')}
            />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.name} value={f.name} className="text-xs">
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t('filter.operator', 'Operator')}</Label>
        <Select
          value={rule.operator}
          onValueChange={(v) => setOperator(v as FilterOperator)}
          disabled={disabled || !rule.fieldName}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableOperators.map((op) => (
              <SelectItem key={op} value={op} className="text-xs">
                {t(operatorLabels[op], op)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {needsValue && (
        <div className="space-y-1">
          <Label className="text-xs">
            {needsList
              ? t('filter.values', 'Values')
              : t('filter.value', 'Value')}
          </Label>

          {needsTwoValues ? (
            <div className="flex gap-2">
              <Input
                className="h-8 text-xs"
                placeholder={t('filter.minValue', 'Min')}
                value={
                  Array.isArray(rule.value) ? String(rule.value[0] ?? '') : ''
                }
                onChange={(e) =>
                  onChange({
                    ...rule,
                    value: [
                      parseTypedValue(semanticType, e.target.value),
                      Array.isArray(rule.value) ? rule.value[1] : '',
                    ],
                  })
                }
                disabled={disabled || !rule.fieldName}
              />
              <Input
                className="h-8 text-xs"
                placeholder={t('filter.maxValue', 'Max')}
                value={
                  Array.isArray(rule.value) ? String(rule.value[1] ?? '') : ''
                }
                onChange={(e) =>
                  onChange({
                    ...rule,
                    value: [
                      Array.isArray(rule.value) ? rule.value[0] : '',
                      parseTypedValue(semanticType, e.target.value),
                    ],
                  })
                }
                disabled={disabled || !rule.fieldName}
              />
            </div>
          ) : (
            <Input
              className="h-8 text-xs"
              placeholder={
                needsList
                  ? t('filter.listHint', 'Comma-separated')
                  : t('filter.value', 'Value')
              }
              value={
                Array.isArray(rule.value)
                  ? rule.value.map(String).join(', ')
                  : String(rule.value ?? '')
              }
              onChange={(e) => {
                const raw = e.target.value
                onChange({
                  ...rule,
                  value: needsList
                    ? raw
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : parseTypedValue(semanticType, raw),
                })
              }}
              disabled={disabled || !rule.fieldName}
            />
          )}
        </div>
      )}
    </div>
  )
}
