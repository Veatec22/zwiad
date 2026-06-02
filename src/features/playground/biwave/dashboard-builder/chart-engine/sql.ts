import type { Aggregation, FilterOperator, FilterRule } from './types'

// Helpers

/** Safely quote SQL identifier */
const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`

/** Format value for SQL */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (Array.isArray(value)) {
    return `(${value.map(formatValue).join(', ')})`
  }
  // String - escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`
}

/** Map aggregation type to DuckDB SQL function */
const aggToSql = (agg: Aggregation, field: string): string => {
  const quoted = quoteIdent(field)
  switch (agg) {
    case 'sum':
      return `SUM(${quoted})`
    case 'avg':
      return `AVG(${quoted})`
    case 'count':
      return `COUNT(${quoted})`
    case 'countDistinct':
      return `COUNT(DISTINCT ${quoted})`
    case 'min':
      return `MIN(${quoted})`
    case 'max':
      return `MAX(${quoted})`
    case 'median':
      return `MEDIAN(${quoted})`
    case 'stddev':
      return `STDDEV(${quoted})`
    case 'variance':
      return `VARIANCE(${quoted})`
    default:
      return `SUM(${quoted})`
  }
}

// Filter Builder

const operatorToSql = (
  field: string,
  operator: FilterOperator,
  value: unknown,
): string => {
  const quoted = quoteIdent(field)

  const isEmpty = (v: unknown): boolean =>
    v === null || v === undefined || v === ''

  switch (operator) {
    case 'eq':
      if (isEmpty(value)) return '1=1'
      return `${quoted} = ${formatValue(value)}`
    case 'neq':
      if (isEmpty(value)) return '1=1'
      return `${quoted} != ${formatValue(value)}`
    case 'gt':
      if (isEmpty(value)) return '1=1'
      return `${quoted} > ${formatValue(value)}`
    case 'gte':
      if (isEmpty(value)) return '1=1'
      return `${quoted} >= ${formatValue(value)}`
    case 'lt':
      if (isEmpty(value)) return '1=1'
      return `${quoted} < ${formatValue(value)}`
    case 'lte':
      if (isEmpty(value)) return '1=1'
      return `${quoted} <= ${formatValue(value)}`
    case 'in':
      if (!Array.isArray(value) || value.length === 0) return '1=1'
      return `${quoted} IN ${formatValue(value)}`
    case 'notIn':
      if (!Array.isArray(value) || value.length === 0) return '1=1'
      return `${quoted} NOT IN ${formatValue(value)}`
    case 'contains':
      if (isEmpty(value)) return '1=1'
      return `${quoted} ILIKE ${formatValue(`%${value}%`)}`
    case 'notContains':
      if (isEmpty(value)) return '1=1'
      return `${quoted} NOT ILIKE ${formatValue(`%${value}%`)}`
    case 'startsWith':
      if (isEmpty(value)) return '1=1'
      return `${quoted} ILIKE ${formatValue(`${value}%`)}`
    case 'endsWith':
      if (isEmpty(value)) return '1=1'
      return `${quoted} ILIKE ${formatValue(`%${value}`)}`
    case 'between': {
      if (!Array.isArray(value)) return '1=1'
      const [min, max] = value as [unknown, unknown]
      if (isEmpty(min) && isEmpty(max)) return '1=1'
      if (isEmpty(min)) return `${quoted} <= ${formatValue(max)}`
      if (isEmpty(max)) return `${quoted} >= ${formatValue(min)}`
      return `${quoted} BETWEEN ${formatValue(min)} AND ${formatValue(max)}`
    }
    case 'isNull':
      return `${quoted} IS NULL`
    case 'isNotNull':
      return `${quoted} IS NOT NULL`
    default:
      return '1=1'
  }
}

export const buildWhereClause = (filters: FilterRule[]): string => {
  const enabledFilters = filters.filter((f) => f.enabled)
  if (enabledFilters.length === 0) return ''

  const conditions = enabledFilters.map((f) =>
    operatorToSql(f.fieldName, f.operator, f.value),
  )

  return `WHERE ${conditions.join(' AND ')}`
}

const appendCondition = (whereClause: string, condition: string) => {
  if (!condition.trim()) return whereClause
  if (!whereClause) return `WHERE ${condition}`
  return `${whereClause} AND ${condition}`
}

// Main Query Builder

export interface BuildQueryArgs {
  tableName: string
  /** Dimension fields for GROUP BY (can be multiple) */
  dimensions: string[]
  /** Measure fields to aggregate */
  measures: Array<{
    field: string
    aggregation: Aggregation
    alias?: string
  }>
  /** Optional color/grouping dimension */
  colorDimension?: string
  /** Filters */
  filters?: FilterRule[]
  /** Sort */
  sortBy?: string
  sortDirection?: 'asc' | 'desc' | 'none'
  /** Limit */
  limit?: number
}

export const buildQuery = ({
  tableName,
  dimensions,
  measures,
  colorDimension,
  filters = [],
  sortBy,
  sortDirection = 'desc',
  limit = 1000,
}: BuildQueryArgs): string => {
  const table = quoteIdent(tableName)

  // SELECT clause
  const selectParts: string[] = []

  // Add dimensions
  dimensions.forEach((dim, i) => {
    selectParts.push(`${quoteIdent(dim)} AS dim_${i}`)
  })

  // Add color dimension if different from regular dimensions
  if (colorDimension && !dimensions.includes(colorDimension)) {
    selectParts.push(`${quoteIdent(colorDimension)} AS color_dim`)
  }

  // Add measures
  measures.forEach((m, i) => {
    const alias = m.alias || `measure_${i}`
    if (m.aggregation === 'count' && !m.field) {
      selectParts.push(`COUNT(*) AS ${quoteIdent(alias)}`)
    } else {
      selectParts.push(
        `${aggToSql(m.aggregation, m.field)} AS ${quoteIdent(alias)}`,
      )
    }
  })

  // WHERE clause
  const whereClause = buildWhereClause(filters)

  // GROUP BY clause
  const groupByFields: string[] = [...dimensions]
  if (colorDimension && !dimensions.includes(colorDimension)) {
    groupByFields.push(colorDimension)
  }
  const groupByClause =
    groupByFields.length > 0
      ? `GROUP BY ${groupByFields.map((_, i) => i + 1).join(', ')}`
      : ''

  // ORDER BY clause
  let orderByClause = ''
  if (sortDirection !== 'none' && sortBy) {
    orderByClause = `ORDER BY ${quoteIdent(sortBy)} ${sortDirection.toUpperCase()}`
  } else if (sortDirection !== 'none' && measures.length > 0) {
    // Default: sort by first measure
    const firstMeasureAlias = measures[0].alias || 'measure_0'
    orderByClause = `ORDER BY ${quoteIdent(firstMeasureAlias)} ${sortDirection.toUpperCase()}`
  }

  // LIMIT clause
  const limitClause = `LIMIT ${Math.max(1, Math.floor(limit))}`

  return `
SELECT
  ${selectParts.join(',\n  ')}
FROM ${table}
${whereClause}
${groupByClause}
${orderByClause}
${limitClause}
`.trim()
}

// Simple Query Builder (backwards compatibility)

export interface BuildAggregateSqlArgs {
  tableName: string
  dimension: string
  aggregation: Aggregation
  measure?: string | null
  colorDimension?: string
  filters?: FilterRule[]
  limit?: number
  sortDirection?: 'asc' | 'desc' | 'none'
}

export const buildAggregateSql = ({
  tableName,
  dimension,
  aggregation,
  measure,
  colorDimension,
  filters = [],
  limit = 100,
  sortDirection = 'desc',
}: BuildAggregateSqlArgs): string => {
  const table = quoteIdent(tableName)
  const dim = quoteIdent(dimension)

  if (aggregation !== 'count' && !measure) {
    throw new Error('Measure is required for non-count aggregations.')
  }

  // SELECT parts
  const selectParts = [`${dim} AS x`]

  // Color dimension
  if (colorDimension && colorDimension !== dimension) {
    selectParts.push(`${quoteIdent(colorDimension)} AS color`)
  }

  // Measure
  const measureExpr =
    aggregation === 'count' && !measure
      ? 'COUNT(*)'
      : aggToSql(aggregation, measure || '')
  selectParts.push(`${measureExpr} AS y`)

  // WHERE
  const whereClause = buildWhereClause(filters)

  // GROUP BY
  const groupByIndices =
    colorDimension && colorDimension !== dimension ? '1, 2' : '1'

  // ORDER BY
  const orderClause =
    sortDirection === 'none' ? '' : `ORDER BY y ${sortDirection.toUpperCase()}`

  return `
SELECT
  ${selectParts.join(',\n  ')}
FROM ${table}
${whereClause}
GROUP BY ${groupByIndices}
${orderClause}
LIMIT ${Math.max(1, Math.floor(limit))}
`.trim()
}

// Scatter Query Builder

export const buildScatterQuery = ({
  tableName,
  xField,
  yField,
  sizeField,
  colorField,
  filters = [],
  limit = 5000,
}: {
  tableName: string
  xField: string
  yField: string
  sizeField?: string | null
  colorField?: string | null
  filters?: FilterRule[]
  limit?: number
}) => {
  const table = quoteIdent(tableName)
  const x = quoteIdent(xField)
  const y = quoteIdent(yField)

  const selectParts = [`CAST(${x} AS DOUBLE) AS x`, `CAST(${y} AS DOUBLE) AS y`]

  if (sizeField) {
    selectParts.push(`CAST(${quoteIdent(sizeField)} AS DOUBLE) AS size`)
  }
  if (colorField) {
    selectParts.push(`${quoteIdent(colorField)} AS color`)
  }

  let whereClause = buildWhereClause(filters)
  whereClause = appendCondition(whereClause, `${x} IS NOT NULL`)
  whereClause = appendCondition(whereClause, `${y} IS NOT NULL`)

  if (sizeField) {
    whereClause = appendCondition(
      whereClause,
      `${quoteIdent(sizeField)} IS NOT NULL`,
    )
  }

  return `
SELECT
  ${selectParts.join(',\n  ')}
FROM ${table}
${whereClause}
LIMIT ${Math.max(1, Math.floor(limit))}
`.trim()
}

// Specialized Query Builders

/** Build query for heatmap (requires 2 dimensions + 1 measure) */
export const buildHeatmapQuery = ({
  tableName,
  xDimension,
  yDimension,
  measure,
  aggregation,
  filters = [],
}: {
  tableName: string
  xDimension: string
  yDimension: string
  measure: string
  aggregation: Aggregation
  filters?: FilterRule[]
}): string => {
  const table = quoteIdent(tableName)
  const xDim = quoteIdent(xDimension)
  const yDim = quoteIdent(yDimension)
  const measureExpr = aggToSql(aggregation, measure)
  const whereClause = buildWhereClause(filters)

  return `
SELECT
  ${xDim} AS x,
  ${yDim} AS y,
  ${measureExpr} AS value
FROM ${table}
${whereClause}
GROUP BY 1, 2
ORDER BY 1, 2
`.trim()
}

/** Build query for Sankey (source → target → value) */
export const buildSankeyQuery = ({
  tableName,
  sourceField,
  targetField,
  valueField,
  aggregation,
  filters = [],
}: {
  tableName: string
  sourceField: string
  targetField: string
  valueField: string
  aggregation: Aggregation
  filters?: FilterRule[]
}): string => {
  const table = quoteIdent(tableName)
  const source = quoteIdent(sourceField)
  const target = quoteIdent(targetField)
  const valueExpr = aggToSql(aggregation, valueField)
  const whereClause = buildWhereClause(filters)

  return `
SELECT
  ${source} AS source,
  ${target} AS target,
  ${valueExpr} AS value
FROM ${table}
${whereClause}
GROUP BY 1, 2
HAVING ${valueExpr} > 0
ORDER BY value DESC
`.trim()
}

/** Build query for Treemap (hierarchical) */
export const buildTreemapQuery = ({
  tableName,
  hierarchyFields,
  valueField,
  aggregation,
  filters = [],
}: {
  tableName: string
  hierarchyFields: string[] // e.g., ['category', 'subcategory']
  valueField: string
  aggregation: Aggregation
  filters?: FilterRule[]
}): string => {
  const table = quoteIdent(tableName)
  const dims = hierarchyFields.map(quoteIdent)
  const valueExpr = aggToSql(aggregation, valueField)
  const whereClause = buildWhereClause(filters)

  return `
SELECT
  ${dims.map((d, i) => `${d} AS level_${i}`).join(',\n  ')},
  ${valueExpr} AS value
FROM ${table}
${whereClause}
GROUP BY ${dims.map((_, i) => i + 1).join(', ')}
ORDER BY value DESC
`.trim()
}

/** Build query for Boxplot (needs raw values for statistical calculation) */
export const buildBoxplotQuery = ({
  tableName,
  dimension,
  measure,
  filters = [],
}: {
  tableName: string
  dimension: string
  measure: string
  filters?: FilterRule[]
}): string => {
  const table = quoteIdent(tableName)
  const dim = quoteIdent(dimension)
  const meas = quoteIdent(measure)
  const whereClause = buildWhereClause(filters)

  // DuckDB has built-in quantile functions
  return `
SELECT
  ${dim} AS category,
  MIN(${meas}) AS min,
  QUANTILE_CONT(${meas}, 0.25) AS q1,
  MEDIAN(${meas}) AS median,
  QUANTILE_CONT(${meas}, 0.75) AS q3,
  MAX(${meas}) AS max
FROM ${table}
${whereClause}
GROUP BY 1
ORDER BY 1
`.trim()
}

/** Build query for Funnel */
export const buildFunnelQuery = ({
  tableName,
  stageField,
  valueField,
  aggregation,
  filters = [],
}: {
  tableName: string
  stageField: string
  valueField: string
  aggregation: Aggregation
  filters?: FilterRule[]
}): string => {
  const table = quoteIdent(tableName)
  const stage = quoteIdent(stageField)
  const valueExpr = aggToSql(aggregation, valueField)
  const whereClause = buildWhereClause(filters)

  return `
SELECT
  ${stage} AS stage,
  ${valueExpr} AS value
FROM ${table}
${whereClause}
GROUP BY 1
ORDER BY value DESC
`.trim()
}

// Get distinct values (for filters)

export const buildDistinctValuesQuery = ({
  tableName,
  field,
  limit = 1000,
}: {
  tableName: string
  field: string
  limit?: number
}): string => {
  const table = quoteIdent(tableName)
  const col = quoteIdent(field)

  return `
SELECT DISTINCT ${col} AS value
FROM ${table}
WHERE ${col} IS NOT NULL
ORDER BY ${col}
LIMIT ${limit}
`.trim()
}

/** Get min/max for numeric field (for range filters) */
export const buildMinMaxQuery = ({
  tableName,
  field,
}: {
  tableName: string
  field: string
}): string => {
  const table = quoteIdent(tableName)
  const col = quoteIdent(field)

  return `
SELECT
  MIN(${col}) AS min_val,
  MAX(${col}) AS max_val
FROM ${table}
WHERE ${col} IS NOT NULL
`.trim()
}
