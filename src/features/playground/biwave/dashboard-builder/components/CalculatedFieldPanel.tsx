import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import { sql } from '@codemirror/lang-sql'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppCodeMirror from '@/components/common/AppCodeMirror'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icons } from '@/config/icons'
import type { CalculatedFieldSpec } from '../chart-engine/calculatedFields'

interface CalculatedFieldPanelProps {
  onSubmit: (spec: CalculatedFieldSpec) => Promise<void> | void
  onCancel: () => void
  disabled?: boolean
  availableFields?: string[]
  isEditing?: boolean
  initialName?: string
  initialExpression?: string
}
function hasBalancedExpression(expression: string) {
  let singleQuoted = false
  let doubleQuoted = false
  let depth = 0

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index]
    const prev = index > 0 ? expression[index - 1] : ''

    if (char === "'" && prev !== '\\' && !doubleQuoted) {
      singleQuoted = !singleQuoted
      continue
    }

    if (char === '"' && prev !== '\\' && !singleQuoted) {
      doubleQuoted = !doubleQuoted
      continue
    }

    if (singleQuoted || doubleQuoted) continue

    if (char === '(') depth += 1
    if (char === ')') {
      depth -= 1
      if (depth < 0) return false
    }
  }

  if (singleQuoted || doubleQuoted) return false
  return depth === 0
}

function endsWithOperator(expression: string) {
  return /(\b(and|or|in|like|between|when|then|else)\b|[+\-*/%<>=,])\s*$/i.test(
    expression,
  )
}

export function CalculatedFieldPanel({
  availableFields = [],
  disabled,
  initialExpression = '',
  initialName = '',
  isEditing = false,
  onCancel,
  onSubmit,
}: CalculatedFieldPanelProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [expression, setExpression] = useState(initialExpression)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const normalizedFields = useMemo(() => {
    return [...availableFields].sort((a, b) => a.localeCompare(b))
  }, [availableFields])

  const quoteIdent = useCallback(
    (value: string) => `"${value.replace(/"/g, '""')}"`,
    [],
  )

  const columnCompletions = useCallback(
    (context: CompletionContext): CompletionResult | null => {
      const word = context.matchBefore(/"[^"]*"|[A-Za-z_][A-Za-z0-9_]*/)
      if (!word || (word.from === word.to && !context.explicit)) return null

      return {
        from: word.from,
        to: word.to,
        options: normalizedFields.map((field) => ({
          apply: quoteIdent(field),
          label: field,
          type: 'variable',
        })),
      }
    },
    [normalizedFields, quoteIdent],
  )

  const nameTrimmed = name.trim()
  const expressionTrimmed = expression.trim()

  const validationError = useMemo(() => {
    if (!nameTrimmed)
      return t('calculated.errors.nameRequired', 'Field name is required.')
    if (!expressionTrimmed) {
      return t(
        'calculated.errors.expressionRequired',
        'Expression is required.',
      )
    }
    if (expressionTrimmed.includes(';')) {
      return t(
        'calculated.errors.semicolon',
        'Semicolons are not allowed in expressions.',
      )
    }

    const forbidden =
      /\b(from|join|insert|update|delete|drop|create|alter|copy|attach|detach|pragma|export|import)\b/i
    if (forbidden.test(expressionTrimmed)) {
      return t(
        'calculated.errors.expressionOnly',
        'Only a single expression is allowed.',
      )
    }

    if (
      !hasBalancedExpression(expressionTrimmed) ||
      endsWithOperator(expressionTrimmed)
    ) {
      return t('calculated.errors.syntax', 'Expression has invalid SQL syntax.')
    }

    return null
  }, [expressionTrimmed, nameTrimmed, t])

  const canSubmit = !disabled && !isSubmitting && validationError === null
  const visibleValidationError = hasInteracted ? validationError : null

  const handleSubmit = async () => {
    if (!canSubmit) {
      setHasInteracted(true)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({ expression, name })
      onCancel()
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : String(nextError),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icons.calculatedFieldAdd className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate font-medium text-xs">
            {isEditing
              ? t('calculated.editTitle', 'Edit calculated field')
              : t('calculated.title', 'Calculated field')}
          </span>
        </div>
        <Button
          className="h-6 px-2 text-[11px]"
          onClick={onCancel}
          size="sm"
          type="button"
          variant="ghost"
        >
          {t('calculated.cancel', 'Cancel')}
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">{t('calculated.name', 'Name')}</Label>
        <Input
          className="h-8 text-xs"
          disabled={disabled || isEditing}
          onChange={(event) => {
            setName(event.target.value)
            setHasInteracted(true)
          }}
          placeholder={t('calculated.namePlaceholder', 'revenue_per_user')}
          value={name}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">
          {t('calculated.expression', 'Expression')}
        </Label>
        <AppCodeMirror
          basicSetup={{
            allowMultipleSelections: false,
            dropCursor: false,
            foldGutter: false,
            indentOnInput: false,
          }}
          className="w-full overflow-hidden rounded-md border border-border text-sm"
          extensions={[
            sql(),
            autocompletion({ override: [columnCompletions] }),
          ]}
          height="130px"
          onChange={(value) => {
            setExpression(value)
            setHasInteracted(true)
          }}
          placeholder={t(
            'calculated.expressionPlaceholder',
            'revenue / NULLIF(users, 0)',
          )}
          readOnly={disabled || isSubmitting}
          value={expression}
        />
      </div>

      {(error || visibleValidationError) && (
        <div className="text-destructive text-xs">
          {error ?? visibleValidationError}
        </div>
      )}

      <Button
        className="h-8 text-xs"
        disabled={!canSubmit}
        onClick={handleSubmit}
        type="button"
        variant="primary"
      >
        <Icons.calculatedFieldAdd className="h-3.5 w-3.5" />
        {isSubmitting
          ? t('calculated.saving', 'Saving...')
          : isEditing
            ? t('calculated.save', 'Save')
            : t('calculated.create', 'Add')}
      </Button>
    </div>
  )
}
