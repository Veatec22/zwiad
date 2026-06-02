const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`

export interface CalculatedFieldSpec {
  name: string
  expression: string
}

export const validateCalculatedField = (spec: CalculatedFieldSpec) => {
  const name = spec.name.trim()
  const expr = spec.expression.trim()

  if (!name) return 'Field name is required.'
  if (!expr) return 'Expression is required.'
  if (expr.includes(';')) return 'Semicolons are not allowed in expressions.'

  const forbidden =
    /\b(from|join|insert|update|delete|drop|create|alter|copy|attach|detach|pragma|export|import)\b/i
  if (forbidden.test(expr)) {
    return 'Only a single expression is allowed (no statements like FROM/JOIN/CREATE).'
  }

  return null
}

export const buildCalculatedViewSql = ({
  baseTableName,
  viewName,
  calculatedFields,
}: {
  baseTableName: string
  viewName: string
  calculatedFields: CalculatedFieldSpec[]
}) => {
  const base = quoteIdent(baseTableName)
  const view = quoteIdent(viewName)

  const projections =
    calculatedFields.length === 0
      ? '*'
      : `*,\n  ${calculatedFields
          .map(
            (f) => `(${f.expression.trim()}) AS ${quoteIdent(f.name.trim())}`,
          )
          .join(',\n  ')}`

  return `
CREATE OR REPLACE VIEW ${view} AS
SELECT
  ${projections}
FROM ${base}
`.trim()
}
