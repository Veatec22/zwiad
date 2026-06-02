import type { DatasetField, SemanticType } from './types'

const numericPrefixes = [
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'TINYINT',
  'HUGEINT',
  'UTINYINT',
  'USMALLINT',
  'UINTEGER',
  'UBIGINT',
  'DOUBLE',
  'REAL',
  'FLOAT',
  'DECIMAL',
  'NUMERIC',
]

const temporalPrefixes = ['DATE', 'TIME', 'TIMESTAMP', 'INTERVAL']

export const duckdbTypeToSemantic = (duckdbTypeRaw: string): SemanticType => {
  const t = duckdbTypeRaw.toUpperCase()
  if (numericPrefixes.some((p) => t.startsWith(p))) return 'quantitative'
  if (temporalPrefixes.some((p) => t.startsWith(p))) return 'temporal'
  return 'nominal'
}

export const fieldsFromDescribeRows = (
  rows: Array<Record<string, unknown>>,
): DatasetField[] => {
  const fields: DatasetField[] = []

  for (const row of rows) {
    const name =
      typeof row.column_name === 'string'
        ? row.column_name
        : typeof row.name === 'string'
          ? row.name
          : null

    const duckdbType =
      typeof row.column_type === 'string'
        ? row.column_type
        : typeof row.type === 'string'
          ? row.type
          : null

    if (!name || !duckdbType) continue

    fields.push({
      name,
      duckdbType,
      semanticType: duckdbTypeToSemantic(duckdbType),
    })
  }

  return fields
}
