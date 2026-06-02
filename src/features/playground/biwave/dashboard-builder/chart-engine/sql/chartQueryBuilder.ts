import type { ChartType } from '../configs'
import type { EncodedFieldValue } from '../configs/types'
import { buildWhereClause } from '../sql'
import type { WidgetChannels, WidgetStyles } from '../store/dashboardStore'
import type { Aggregation, FilterRule } from '../types'

// Helpers

const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`
const labelValue = (value: unknown) =>
  value === null || value === undefined ? 'null' : String(value)

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

const getLabelStyle = (
  styles: WidgetStyles,
  defaultPosition: string = 'top',
) => {
  const show = (styles.showLabels as boolean) ?? false
  const fontSize = (styles.labelFontSize as number) ?? 12
  const matchColor = (styles.labelMatchSeriesColor as boolean) ?? false
  const color = (styles.labelColor as string) ?? undefined
  const bold = (styles.labelBold as boolean) ?? false
  const italic = (styles.labelItalic as boolean) ?? false
  const underline = (styles.labelUnderline as boolean) ?? false
  const position = (styles.labelPosition as string) ?? defaultPosition

  return {
    show,
    position,
    fontSize,
    color: matchColor ? 'inherit' : color,
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underline ? 'underline' : 'none',
  }
}

const getDecimalPlaces = (styles: WidgetStyles) => {
  const value = Number(styles.decimalPlaces)
  if (!Number.isFinite(value)) return 2
  return Math.max(0, Math.min(6, Math.round(value)))
}

const formatNumberValue = (value: unknown, styles: WidgetStyles) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value ?? '')

  const decimalPlaces = getDecimalPlaces(styles)
  const numberFormat = (styles.numberFormat as string) ?? 'number'
  const currencyCode =
    typeof styles.currencyCode === 'string' && styles.currencyCode.trim()
      ? styles.currencyCode
      : 'USD'

  if (numberFormat === 'currency') {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(numeric)
  }

  if (numberFormat === 'compact') {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: decimalPlaces,
    }).format(numeric)
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(numeric)
}

const getAxisTextStyle = (styles: WidgetStyles, axisKey: 'x' | 'y') => {
  const prefix = axisKey === 'x' ? 'xAxis' : 'yAxis'
  const axisColor =
    (styles[`${prefix}Color`] as string) ??
    (styles.axisColor as string) ??
    'hsl(var(--muted-foreground))'
  const axisFontSize =
    typeof styles[`${prefix}FontSize`] === 'number'
      ? Number(styles[`${prefix}FontSize`])
      : typeof styles.axisFontSize === 'number'
        ? Number(styles.axisFontSize)
        : 11
  const axisBold =
    (styles[`${prefix}Bold`] as boolean | undefined) ??
    (styles.axisBold as boolean) ??
    false
  const axisItalic =
    (styles[`${prefix}Italic`] as boolean | undefined) ??
    (styles.axisItalic as boolean) ??
    false
  const axisUnderline =
    (styles[`${prefix}Underline`] as boolean | undefined) ??
    (styles.axisUnderline as boolean) ??
    false

  return {
    color: axisColor,
    fontSize: axisFontSize,
    fontWeight: axisBold ? 'bold' : 'normal',
    fontStyle: axisItalic ? 'italic' : 'normal',
    textDecoration: axisUnderline ? 'underline' : 'none',
  }
}

const applyAxisStyle = (
  axis: Record<string, unknown>,
  styles: WidgetStyles,
  isValueAxis: boolean,
  axisKey: 'x' | 'y',
): Record<string, unknown> => {
  const prefix = axisKey === 'x' ? 'xAxis' : 'yAxis'
  const showAxis =
    (styles[`show${axisKey.toUpperCase()}Axis`] as boolean | undefined) ??
    (styles.showAxis as boolean) ??
    true
  const axisLineWidth =
    typeof styles[`${prefix}LineWidth`] === 'number'
      ? Number(styles[`${prefix}LineWidth`])
      : typeof styles.axisLineWidth === 'number'
        ? Number(styles.axisLineWidth)
        : 1
  const axisColor =
    (styles[`${prefix}LineColor`] as string) ??
    (styles[`${prefix}Color`] as string) ??
    (styles.axisColor as string) ??
    'hsl(var(--muted-foreground))'
  const axisLine = (axis.axisLine as Record<string, unknown> | undefined) ?? {}
  const axisLineStyle =
    (axisLine.lineStyle as Record<string, unknown> | undefined) ?? {}
  const axisTick = (axis.axisTick as Record<string, unknown> | undefined) ?? {}
  const axisLabel =
    (axis.axisLabel as Record<string, unknown> | undefined) ?? {}
  const styledAxisLabel: Record<string, unknown> = {
    ...axisLabel,
    ...getAxisTextStyle(styles, axisKey),
    show: showAxis,
  }

  if (isValueAxis && !axisLabel.formatter) {
    styledAxisLabel.formatter = (value: unknown) =>
      formatNumberValue(value, styles)
  }

  return {
    ...axis,
    show: showAxis,
    axisLine: {
      ...axisLine,
      show: showAxis,
      lineStyle: {
        ...axisLineStyle,
        width: axisLineWidth,
        color: axisColor,
      },
    },
    axisTick: {
      ...axisTick,
      show: showAxis,
    },
    axisLabel: styledAxisLabel,
  }
}

const getFieldsFromChannel = (
  channels: WidgetChannels,
  channelId: string,
): EncodedFieldValue[] => {
  return channels[channelId] || []
}

const getFirstField = (
  channels: WidgetChannels,
  channelId: string,
): EncodedFieldValue | null => {
  const fields = getFieldsFromChannel(channels, channelId)
  return fields.length > 0 ? fields[0] : null
}

// Query Builders per Chart Type

interface QueryBuilderParams {
  tableName: string
  channels: WidgetChannels
  globalFilters: FilterRule[]
  localFilters: FilterRule[]
}

interface QueryResult {
  sql: string
  columns: string[]
}

// --- Bar / Line / Area ---
function buildBarLineAreaQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const xFields = getFieldsFromChannel(channels, 'x')
  const yFields = getFieldsFromChannel(channels, 'y')
  const colorField = getFirstField(channels, 'color')

  if (xFields.length === 0 || yFields.length === 0) return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)

  const selectParts: string[] = []
  const groupByParts: string[] = []
  const columns: string[] = []

  // X dimensions (can be multiple for concatenated labels)
  if (xFields.length === 1) {
    selectParts.push(`${quoteIdent(xFields[0].name)} AS x`)
    groupByParts.push(quoteIdent(xFields[0].name))
    columns.push('x')
  } else {
    // Multiple dimensions - concatenate
    const concat = xFields
      .map((f) => `COALESCE(CAST(${quoteIdent(f.name)} AS VARCHAR), 'null')`)
      .join(" || ' - ' || ")
    selectParts.push(`${concat} AS x`)
    xFields.forEach((f) => {
      groupByParts.push(quoteIdent(f.name))
    })
    columns.push('x')
  }

  // Color dimension
  if (colorField) {
    selectParts.push(`${quoteIdent(colorField.name)} AS color`)
    groupByParts.push(quoteIdent(colorField.name))
    columns.push('color')
  }

  // Y measures (can be multiple for multi-series)
  yFields.forEach((yField, idx) => {
    const agg = yField.aggregation || 'sum'
    const alias = yFields.length === 1 ? 'y' : `y_${idx}`
    selectParts.push(`${aggToSql(agg, yField.name)} AS ${quoteIdent(alias)}`)
    columns.push(alias)
  })

  const sql = `
SELECT
  ${selectParts.join(',\n  ')}
FROM ${quoteIdent(tableName)}
${whereClause}
GROUP BY ${groupByParts.join(', ')}
ORDER BY 1
LIMIT 1000
  `.trim()

  return { sql, columns }
}

// --- Pie / Donut ---
function buildPieQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const segmentField = getFirstField(channels, 'segment')
  const valueField = getFirstField(channels, 'value')

  if (!segmentField || !valueField) return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)
  const agg = valueField.aggregation || 'sum'

  const sql = `
SELECT
  ${quoteIdent(segmentField.name)} AS segment,
  ${aggToSql(agg, valueField.name)} AS value
FROM ${quoteIdent(tableName)}
${whereClause}
GROUP BY 1
HAVING ${aggToSql(agg, valueField.name)} > 0
ORDER BY value DESC
LIMIT 50
  `.trim()

  return { sql, columns: ['segment', 'value'] }
}

// --- Scatter ---
function buildScatterQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const xField = getFirstField(channels, 'x')
  const yField = getFirstField(channels, 'y')

  if (!xField || !yField) return null

  const colorField = getFirstField(channels, 'color')

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)

  const selectParts = [
    `CAST(${quoteIdent(xField.name)} AS DOUBLE) AS x`,
    `CAST(${quoteIdent(yField.name)} AS DOUBLE) AS y`,
  ]
  const columns = ['x', 'y']

  if (colorField) {
    selectParts.push(`${quoteIdent(colorField.name)} AS color`)
    columns.push('color')
  }

  // Additional NULL filters for scatter (need valid numbers)
  let enhancedWhere = whereClause
  const nullChecks = [
    `${quoteIdent(xField.name)} IS NOT NULL`,
    `${quoteIdent(yField.name)} IS NOT NULL`,
  ]

  if (enhancedWhere) {
    enhancedWhere = `${enhancedWhere} AND ${nullChecks.join(' AND ')}`
  } else {
    enhancedWhere = `WHERE ${nullChecks.join(' AND ')}`
  }

  const sql = `
SELECT
  ${selectParts.join(',\n  ')}
FROM ${quoteIdent(tableName)}
${enhancedWhere}
LIMIT 5000
  `.trim()

  return { sql, columns }
}

// --- Radar ---
function buildRadarQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const seriesField = getFirstField(channels, 'series')
  const valueFields = getFieldsFromChannel(channels, 'values')

  if (valueFields.length === 0) return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)

  const selectParts: string[] = []
  const groupByParts: string[] = []
  const columns: string[] = []

  if (seriesField) {
    selectParts.push(`${quoteIdent(seriesField.name)} AS series`)
    groupByParts.push(quoteIdent(seriesField.name))
  } else {
    selectParts.push(`'All' AS series`)
  }
  columns.push('series')

  valueFields.forEach((field, idx) => {
    const agg = field.aggregation || 'avg'
    const alias = `m_${idx}`
    selectParts.push(`${aggToSql(agg, field.name)} AS ${quoteIdent(alias)}`)
    columns.push(alias)
  })

  const groupByClause =
    groupByParts.length > 0 ? `GROUP BY ${groupByParts.join(', ')}` : ''

  const sql = `
SELECT
  ${selectParts.join(',\n  ')}
FROM ${quoteIdent(tableName)}
${whereClause}
${groupByClause}
ORDER BY 1
LIMIT 50
  `.trim()

  return { sql, columns }
}

// --- Heatmap ---
function buildHeatmapQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const xField = getFirstField(channels, 'x')
  const yField = getFirstField(channels, 'y')
  const valueField = getFirstField(channels, 'value')

  if (!xField || !yField || !valueField) return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)
  const agg = valueField.aggregation || 'sum'

  const sql = `
SELECT
  ${quoteIdent(xField.name)} AS x,
  ${quoteIdent(yField.name)} AS y,
  ${aggToSql(agg, valueField.name)} AS value
FROM ${quoteIdent(tableName)}
${whereClause}
GROUP BY 1, 2
ORDER BY 1, 2
LIMIT 2500
  `.trim()

  return { sql, columns: ['x', 'y', 'value'] }
}

// --- Gauge ---
function buildGaugeQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const valueField = getFirstField(channels, 'value')
  if (!valueField) return null

  const labelField = getFirstField(channels, 'label')

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)
  const agg = valueField.aggregation || 'avg'

  if (labelField) {
    const sql = `
SELECT
  ${quoteIdent(labelField.name)} AS name,
  ${aggToSql(agg, valueField.name)} AS value
FROM ${quoteIdent(tableName)}
${whereClause}
GROUP BY 1
ORDER BY value DESC
LIMIT 1
    `.trim()

    return { sql, columns: ['name', 'value'] }
  }

  const sql = `
SELECT
  ${aggToSql(agg, valueField.name)} AS value
FROM ${quoteIdent(tableName)}
${whereClause}
LIMIT 1
  `.trim()

  return { sql, columns: ['value'] }
}

// --- Calendar Heatmap ---
function buildCalendarQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const dateField = getFirstField(channels, 'date')
  const valueField = getFirstField(channels, 'value')

  if (!dateField || !valueField) return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)
  const agg = valueField.aggregation || 'sum'

  const sql = `
SELECT
  CAST(${quoteIdent(dateField.name)} AS DATE) AS day,
  ${aggToSql(agg, valueField.name)} AS value
FROM ${quoteIdent(tableName)}
${whereClause}
GROUP BY 1
ORDER BY 1
LIMIT 4000
  `.trim()

  return { sql, columns: ['day', 'value'] }
}

// --- Funnel ---
function buildFunnelQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const stageField = getFirstField(channels, 'stage')
  const valueField = getFirstField(channels, 'value')

  if (!stageField || !valueField) return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)
  const agg = valueField.aggregation || 'sum'

  const sql = `
SELECT
  ${quoteIdent(stageField.name)} AS stage,
  ${aggToSql(agg, valueField.name)} AS value
FROM ${quoteIdent(tableName)}
${whereClause}
GROUP BY 1
HAVING ${aggToSql(agg, valueField.name)} > 0
ORDER BY value DESC
LIMIT 20
  `.trim()

  return { sql, columns: ['stage', 'value'] }
}

// --- Sankey ---
function buildSankeyQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const sourceField = getFirstField(channels, 'source')
  const targetField = getFirstField(channels, 'target')
  const valueField = getFirstField(channels, 'value')

  if (!sourceField || !targetField || !valueField) return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)
  const agg = valueField.aggregation || 'sum'

  const sql = `
SELECT
  ${quoteIdent(sourceField.name)} AS source,
  ${quoteIdent(targetField.name)} AS target,
  ${aggToSql(agg, valueField.name)} AS value
FROM ${quoteIdent(tableName)}
${whereClause}
GROUP BY 1, 2
HAVING ${aggToSql(agg, valueField.name)} > 0
ORDER BY value DESC
LIMIT 200
  `.trim()

  return { sql, columns: ['source', 'target', 'value'] }
}

// --- Treemap ---
function buildTreemapQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const hierarchyFields = getFieldsFromChannel(channels, 'hierarchy')
  const sizeField = getFirstField(channels, 'size')

  if (hierarchyFields.length === 0 || !sizeField) return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)
  const agg = sizeField.aggregation || 'sum'

  const selectParts = hierarchyFields.map(
    (f, i) => `${quoteIdent(f.name)} AS level_${i}`,
  )
  selectParts.push(`${aggToSql(agg, sizeField.name)} AS value`)

  const groupByParts = hierarchyFields.map((_, i) => String(i + 1))
  const columns = hierarchyFields.map((_, i) => `level_${i}`)
  columns.push('value')

  const sql = `
SELECT
  ${selectParts.join(',\n  ')}
FROM ${quoteIdent(tableName)}
${whereClause}
GROUP BY ${groupByParts.join(', ')}
HAVING ${aggToSql(agg, sizeField.name)} > 0
ORDER BY value DESC
LIMIT 500
  `.trim()

  return { sql, columns }
}

// --- Boxplot ---
function buildBoxplotQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const categoryField = getFirstField(channels, 'category')
  const valueField = getFirstField(channels, 'value')

  if (!categoryField || !valueField) return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)

  const cat = quoteIdent(categoryField.name)
  const val = quoteIdent(valueField.name)
  const baseWhere = whereClause
    ? `${whereClause} AND ${val} IS NOT NULL`
    : `WHERE ${val} IS NOT NULL`

  const sql = `
WITH base AS (
  SELECT
    ${cat} AS category,
    CAST(${val} AS DOUBLE) AS v
  FROM ${quoteIdent(tableName)}
  ${baseWhere}
),
stats AS (
  SELECT
    category,
    MIN(v) AS min,
    QUANTILE_CONT(v, 0.25) AS q1,
    MEDIAN(v) AS median,
    QUANTILE_CONT(v, 0.75) AS q3,
    MAX(v) AS max,
    (QUANTILE_CONT(v, 0.75) - QUANTILE_CONT(v, 0.25)) AS iqr
  FROM base
  GROUP BY 1
  ORDER BY 1
  LIMIT 50
),
outliers AS (
  SELECT
    b.category AS category,
    b.v AS outlier
  FROM base b
  JOIN stats s ON b.category = s.category
  WHERE b.v < s.q1 - 1.5 * s.iqr OR b.v > s.q3 + 1.5 * s.iqr
)
SELECT
  'box' AS kind,
  category,
  min,
  q1,
  median,
  q3,
  max,
  NULL::DOUBLE AS outlier
FROM stats
UNION ALL
SELECT
  'outlier' AS kind,
  category,
  NULL::DOUBLE AS min,
  NULL::DOUBLE AS q1,
  NULL::DOUBLE AS median,
  NULL::DOUBLE AS q3,
  NULL::DOUBLE AS max,
  outlier
FROM outliers
LIMIT 5000
  `.trim()

  return {
    sql,
    columns: [
      'kind',
      'category',
      'min',
      'q1',
      'median',
      'q3',
      'max',
      'outlier',
    ],
  }
}

// --- Combo Chart ---
function buildComboQuery({
  tableName,
  channels,
  globalFilters,
  localFilters,
}: QueryBuilderParams): QueryResult | null {
  const xFields = getFieldsFromChannel(channels, 'x')
  const barFields = getFieldsFromChannel(channels, 'bars')
  const lineFields = getFieldsFromChannel(channels, 'lines').slice(0, 1)

  if (
    xFields.length === 0 ||
    (barFields.length === 0 && lineFields.length === 0)
  )
    return null

  const allFilters = [...globalFilters, ...localFilters]
  const whereClause = buildWhereClause(allFilters)

  const selectParts: string[] = []
  const groupByParts: string[] = []
  const columns: string[] = []

  // X dimension
  selectParts.push(`${quoteIdent(xFields[0].name)} AS x`)
  groupByParts.push(quoteIdent(xFields[0].name))
  columns.push('x')

  // Bar measures
  barFields.forEach((field, idx) => {
    const agg = field.aggregation || 'sum'
    const alias = `bar_${idx}`
    selectParts.push(`${aggToSql(agg, field.name)} AS ${quoteIdent(alias)}`)
    columns.push(alias)
  })

  // Line measures
  lineFields.forEach((field, idx) => {
    const agg = field.aggregation || 'sum'
    const alias = `line_${idx}`
    selectParts.push(`${aggToSql(agg, field.name)} AS ${quoteIdent(alias)}`)
    columns.push(alias)
  })

  const sql = `
SELECT
  ${selectParts.join(',\n  ')}
FROM ${quoteIdent(tableName)}
${whereClause}
GROUP BY ${groupByParts.join(', ')}
ORDER BY 1
LIMIT 1000
  `.trim()

  return { sql, columns }
}

// Main Entry Point

export function buildChartQuery(
  chartType: ChartType,
  params: QueryBuilderParams,
): QueryResult | null {
  switch (chartType) {
    case 'bar':
    case 'line':
    case 'area':
      return buildBarLineAreaQuery(params)
    case 'pie':
      return buildPieQuery(params)
    case 'scatter':
      return buildScatterQuery(params)
    case 'radar':
      return buildRadarQuery(params)
    case 'heatmap':
      return buildHeatmapQuery(params)
    case 'gauge':
      return buildGaugeQuery(params)
    case 'calendar':
      return buildCalendarQuery(params)
    case 'funnel':
      return buildFunnelQuery(params)
    case 'sankey':
      return buildSankeyQuery(params)
    case 'treemap':
      return buildTreemapQuery(params)
    case 'boxplot':
      return buildBoxplotQuery(params)
    case 'combo':
      return buildComboQuery(params)
    default:
      return null
  }
}

// Data Transformers (to ECharts format)

export interface TransformResult {
  data: unknown
  series?: unknown[]
  xAxis?: unknown
  yAxis?: unknown
  options?: Record<string, unknown>
}

export function transformChartData(
  chartType: ChartType,
  rows: Array<Record<string, unknown>>,
  channels: WidgetChannels,
  styles: WidgetStyles,
): TransformResult {
  switch (chartType) {
    case 'bar':
    case 'line':
    case 'area':
      return transformBarLineArea(rows, channels, styles, chartType)
    case 'gauge':
      return transformGauge(rows, channels, styles)
    case 'calendar':
      return transformCalendar(rows, channels, styles)
    case 'pie':
      return transformPie(rows, styles)
    case 'scatter':
      return transformScatter(rows, channels, styles)
    case 'radar':
      return transformRadar(rows, channels, styles)
    case 'heatmap':
      return transformHeatmap(rows, styles)
    case 'funnel':
      return transformFunnel(rows, styles)
    case 'sankey':
      return transformSankey(rows, styles)
    case 'treemap':
      return transformTreemap(rows, channels, styles)
    case 'boxplot':
      return transformBoxplot(rows, styles)
    case 'combo':
      return transformCombo(rows, channels, styles)
    default:
      return { data: rows }
  }
}

// --- Bar / Line / Area Transformer ---
function transformBarLineArea(
  rows: Array<Record<string, unknown>>,
  channels: WidgetChannels,
  styles: WidgetStyles,
  chartType: 'bar' | 'line' | 'area',
): TransformResult {
  const yFields = getFieldsFromChannel(channels, 'y')
  const colorField = getFirstField(channels, 'color')
  const orientation =
    (styles.orientation as 'vertical' | 'horizontal') || 'vertical'
  const stackMode = (styles.stackMode as boolean) ?? false
  const showGrid = (styles.showGrid as boolean) ?? true
  const showLabels = (styles.showLabels as boolean) ?? false
  const gridLineWidth = (styles.gridLineWidth as number) ?? 1
  const gridLineColor = (styles.gridLineColor as string) ?? 'hsl(var(--border))'
  const sortOrder =
    (styles.sortOrder as 'none' | 'ascending' | 'descending') ?? 'none'

  const isHorizontal = orientation === 'horizontal'
  const isStacked = stackMode

  const axisValue: Record<string, unknown> = {
    type: 'value',
    splitLine: {
      show: showGrid,
      lineStyle: { color: gridLineColor, width: gridLineWidth },
    },
  }
  const axisCategory = (categories: string[]): Record<string, unknown> => ({
    type: 'category',
    data: categories,
    axisTick: { show: false },
    splitLine: { show: false },
  })

  // Simple case: no color dimension, single/multi measures
  if (!colorField) {
    let categories = rows.map((r) => labelValue(r.x))

    const smooth = (styles.smooth as boolean) || false
    const lineWidth =
      typeof styles.lineWidth === 'number' ? styles.lineWidth : 2
    const showPoints =
      typeof styles.showPoints === 'boolean'
        ? styles.showPoints
        : chartType === 'line'
    const pointSize =
      typeof styles.pointSize === 'number' ? styles.pointSize : 4
    const areaOpacity =
      typeof styles.opacity === 'number' ? styles.opacity : 0.4
    const showLine = (styles.showLine as boolean) ?? true
    const barOpacity =
      typeof styles.barOpacity === 'number' ? styles.barOpacity : 1
    const barBorderWidth =
      typeof styles.barBorderWidth === 'number' ? styles.barBorderWidth : 0
    const barBorderColor = (styles.barBorderColor as string) ?? 'transparent'

    const barWidth =
      typeof styles.barWidth === 'number' ? `${styles.barWidth}%` : undefined
    const borderRadius =
      typeof styles.borderRadius === 'number' ? styles.borderRadius : 0

    const series = yFields.map((field, idx) => {
      const key = yFields.length === 1 ? 'y' : `y_${idx}`
      const base: Record<string, unknown> = {
        name: field.name,
        type: chartType === 'area' ? 'line' : chartType,
        data: rows.map((r) => Number(r[key] ?? 0)),
        stack: isStacked ? 'total' : undefined,
        emphasis: { focus: 'series' },
      }

      if (chartType === 'bar') {
        base.barWidth = barWidth
        base.itemStyle = {
          borderRadius: isHorizontal
            ? [0, borderRadius, borderRadius, 0]
            : [borderRadius, borderRadius, 0, 0],
          opacity: barOpacity,
          borderWidth: barBorderWidth,
          borderColor: barBorderColor,
        }
        base.label = getLabelStyle(styles, isHorizontal ? 'right' : 'top')
      } else {
        base.smooth = smooth
        base.showSymbol = showPoints
        base.symbolSize = pointSize
        base.lineStyle = { width: lineWidth, opacity: showLine ? 1 : 0 }
        base.label = getLabelStyle(styles, 'top')
      }

      if (chartType === 'area') {
        base.areaStyle = { opacity: areaOpacity }
      }

      return base
    })

    if (chartType === 'bar' && sortOrder !== 'none') {
      const totals = categories.map((_, i) =>
        series.reduce(
          (acc, s) => acc + Number((s.data as number[] | undefined)?.[i] ?? 0),
          0,
        ),
      )
      const indices = totals
        .map((_, i) => i)
        .sort((a, b) =>
          sortOrder === 'ascending'
            ? totals[a] - totals[b]
            : totals[b] - totals[a],
        )

      categories = indices.map((i) => categories[i])
      for (const s of series) {
        const seriesData = s.data
        if (!Array.isArray(seriesData)) continue
        s.data = indices.map((i) => Number(seriesData[i] ?? 0))
      }
    }

    const categoryAxis = applyAxisStyle(
      axisCategory(categories),
      styles,
      false,
      isHorizontal ? 'y' : 'x',
    )
    const valueAxis = applyAxisStyle(
      axisValue,
      styles,
      true,
      isHorizontal ? 'x' : 'y',
    )

    return {
      data: rows,
      series,
      xAxis: isHorizontal ? valueAxis : categoryAxis,
      yAxis: isHorizontal ? categoryAxis : valueAxis,
    }
  }

  // With color dimension: pivot data
  const colorValues = Array.from(new Set(rows.map((r) => labelValue(r.color))))
  let xValues = Array.from(new Set(rows.map((r) => labelValue(r.x))))

  const smooth = (styles.smooth as boolean) || false
  const lineWidth = typeof styles.lineWidth === 'number' ? styles.lineWidth : 2
  const showPoints =
    typeof styles.showPoints === 'boolean'
      ? styles.showPoints
      : chartType === 'line'
  const pointSize = typeof styles.pointSize === 'number' ? styles.pointSize : 4
  const areaOpacity = typeof styles.opacity === 'number' ? styles.opacity : 0.4
  const showLine = (styles.showLine as boolean) ?? true
  const barOpacity =
    typeof styles.barOpacity === 'number' ? styles.barOpacity : 1
  const barBorderWidth =
    typeof styles.barBorderWidth === 'number' ? styles.barBorderWidth : 0
  const barBorderColor = (styles.barBorderColor as string) ?? 'transparent'

  const barWidth =
    typeof styles.barWidth === 'number' ? `${styles.barWidth}%` : undefined
  const borderRadius =
    typeof styles.borderRadius === 'number' ? styles.borderRadius : 0

  const lookup = new Map<string, number>()
  rows.forEach((r) => {
    for (let idx = 0; idx < Math.max(1, yFields.length); idx++) {
      const key = yFields.length === 1 ? 'y' : `y_${idx}`
      const mapKey = `${labelValue(r.x)}||${labelValue(r.color)}||${idx}`
      lookup.set(mapKey, Number(r[key] ?? 0))
    }
  })

  const series: Array<Record<string, unknown>> = []
  for (const color of colorValues) {
    for (let idx = 0; idx < Math.max(1, yFields.length); idx++) {
      const field = yFields[idx] ?? yFields[0]
      const name =
        yFields.length === 1 ? color : `${color} \u00b7 ${field.name}`
      const data = xValues.map((x) => lookup.get(`${x}||${color}||${idx}`) ?? 0)

      const s: Record<string, unknown> = {
        name,
        type: chartType === 'area' ? 'line' : chartType,
        data,
        stack: isStacked ? 'total' : undefined,
        emphasis: { focus: 'series' },
      }

      if (chartType === 'bar') {
        s.barWidth = barWidth
        s.itemStyle = {
          borderRadius: isHorizontal
            ? [0, borderRadius, borderRadius, 0]
            : [borderRadius, borderRadius, 0, 0],
          opacity: barOpacity,
          borderWidth: barBorderWidth,
          borderColor: barBorderColor,
        }
        s.label = {
          show: showLabels,
          position: isHorizontal ? 'right' : 'top',
        }
      } else {
        s.smooth = smooth
        s.showSymbol = showPoints
        s.symbolSize = pointSize
        s.lineStyle = { width: lineWidth, opacity: showLine ? 1 : 0 }
        s.label = { show: showLabels }
      }

      if (chartType === 'area') {
        s.areaStyle = { opacity: areaOpacity }
      }

      series.push(s)
    }
  }

  if (chartType === 'bar' && sortOrder !== 'none') {
    const totals = xValues.map((_, i) =>
      series.reduce(
        (acc, s) => acc + Number((s.data as number[] | undefined)?.[i] ?? 0),
        0,
      ),
    )
    const indices = totals
      .map((_, i) => i)
      .sort((a, b) =>
        sortOrder === 'ascending'
          ? totals[a] - totals[b]
          : totals[b] - totals[a],
      )

    xValues = indices.map((i) => xValues[i])
    for (const s of series) {
      if (!Array.isArray(s.data)) continue
      s.data = indices.map((i) => Number((s.data as unknown[])[i] ?? 0))
    }
  }

  const categoryAxis = applyAxisStyle(
    axisCategory(xValues),
    styles,
    false,
    isHorizontal ? 'y' : 'x',
  )
  const valueAxis = applyAxisStyle(
    axisValue,
    styles,
    true,
    isHorizontal ? 'x' : 'y',
  )

  return {
    data: rows,
    series,
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
  }
}

// --- Gauge Transformer ---
function transformGauge(
  rows: Array<Record<string, unknown>>,
  channels: WidgetChannels,
  styles: WidgetStyles,
): TransformResult {
  const value = Number(rows[0]?.value ?? 0)
  const labelField = getFirstField(channels, 'label')
  const name = labelField ? String(rows[0]?.name ?? '') : ''

  const min = typeof styles.min === 'number' ? styles.min : 0
  const max = typeof styles.max === 'number' ? styles.max : 100
  const splitNumber =
    typeof styles.splitNumber === 'number' ? styles.splitNumber : 5
  const showProgress = (styles.showProgress as boolean) ?? true
  const showPointer = (styles.showPointer as boolean) ?? true

  return {
    data: rows,
    series: [
      {
        type: 'gauge',
        min,
        max,
        splitNumber,
        progress: { show: showProgress },
        pointer: { show: showPointer },
        detail: { formatter: '{value}' },
        data: [{ value, name }],
      },
    ],
  }
}

// --- Calendar Heatmap Transformer ---
function transformCalendar(
  rows: Array<Record<string, unknown>>,
  _channels: WidgetChannels,
  styles: WidgetStyles,
): TransformResult {
  const data = rows
    .map((r) => {
      const day = String(r.day ?? '')
      const value = Number(r.value ?? 0)
      return day ? [day, value] : null
    })
    .filter((v): v is [string, number] => v !== null)

  const values = data.map((d) => d[1])
  const minVal = values.length > 0 ? Math.min(...values) : 0
  const maxVal = values.length > 0 ? Math.max(...values) : 0

  const days = data.map((d) => d[0]).sort()
  const range =
    days.length > 0
      ? [days[0], days[days.length - 1]]
      : String(new Date().getFullYear())

  const cellSize = typeof styles.cellSize === 'number' ? styles.cellSize : 13
  const orient =
    (styles.calendarOrient as 'vertical' | 'horizontal') || 'vertical'

  return {
    data: rows,
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data,
      },
    ],
    options: {
      visualMap: {
        min: minVal,
        max: maxVal,
        type: 'piecewise',
        orient: 'horizontal',
        left: 'center',
        top: 65,
      },
      calendar: {
        top: 120,
        left: 30,
        right: 30,
        cellSize: ['auto', cellSize],
        orient,
        range,
        itemStyle: { borderWidth: 0.5 },
        yearLabel: { show: false },
      },
    },
  }
}

// --- Pie Transformer ---
function transformPie(
  rows: Array<Record<string, unknown>>,
  styles: WidgetStyles,
): TransformResult {
  const variant = (styles.variant as 'pie' | 'donut') || 'pie'
  const innerRadius =
    variant === 'donut'
      ? typeof styles.innerRadius === 'number'
        ? styles.innerRadius
        : 50
      : 0
  const showLegend = (styles.showLegend as boolean) ?? true
  const showLabels = (styles.showLabels as boolean) ?? true
  const percentageMode = (styles.percentageMode as string) ?? 'percentage'
  const showLabelLine = (styles.showLabelLine as boolean) ?? true
  const startAngle = (styles.startAngle as number) ?? 90
  const sortOrder =
    (styles.sortOrder as 'none' | 'ascending' | 'descending') ?? 'none'
  const center: [string, string] = ['50%', '50%']
  const outerRadius = showLegend ? '70%' : '78%'

  const data = rows.map((r) => ({
    name: labelValue(r.segment),
    value: Number(r.value ?? 0),
  }))

  if (sortOrder !== 'none') {
    data.sort((a, b) =>
      sortOrder === 'ascending' ? a.value - b.value : b.value - a.value,
    )
  }

  let formatter = '{b}: {c}'
  if (percentageMode === 'percentage') {
    formatter = '{b}: {d}%'
  } else if (percentageMode === 'value_percentage') {
    formatter = '{b}: {c} ({d}%)'
  } else if (percentageMode === 'none') {
    formatter = '{b}: {c}'
  }

  return {
    data,
    series: [
      {
        type: 'pie',
        radius: [`${innerRadius}%`, outerRadius],
        center,
        data,
        startAngle,
        label: {
          ...getLabelStyle(styles, 'outside'),
          position:
            styles.labelPosition === 'top' || !styles.labelPosition
              ? 'outside'
              : (styles.labelPosition as string),
          show: showLabels,
          formatter,
        },
        labelLine: {
          show: showLabels && showLabelLine,
          length: 15,
          length2: 10,
        },
      },
    ],
  }
}

// --- Scatter Transformer ---
function transformScatter(
  rows: Array<Record<string, unknown>>,
  channels: WidgetChannels,
  styles: WidgetStyles,
): TransformResult {
  const colorField = getFirstField(channels, 'color')
  const pointSize = (styles.pointSize as number) || 10
  const opacity = (styles.opacity as number) ?? 0.7
  const showGrid = (styles.showGrid as boolean) ?? true
  const showTrendline = (styles.showTrendline as boolean) ?? false
  const trendlineColor =
    (styles.trendlineColor as string) ?? 'hsl(var(--foreground))'
  const trendlineWidth = (styles.trendlineWidth as number) ?? 2
  const gridLineWidth = (styles.gridLineWidth as number) ?? 1
  const gridLineColor = (styles.gridLineColor as string) ?? 'hsl(var(--border))'

  const buildTrendlineSeries = (
    points: Array<[number, number]>,
  ): Record<string, unknown> | null => {
    if (!showTrendline || points.length < 2) return null
    const xs = points.map((d) => d[0])
    const ys = points.map((d) => d[1])
    const n = points.length
    const sumX = xs.reduce((a, b) => a + b, 0)
    const sumY = ys.reduce((a, b) => a + b, 0)
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
    const sumXX = xs.reduce((acc, x) => acc + x * x, 0)
    const denom = n * sumXX - sumX * sumX
    if (denom === 0) return null

    const slope = (n * sumXY - sumX * sumY) / denom
    const intercept = (sumY - slope * sumX) / n
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    return {
      type: 'line',
      data: [
        [minX, slope * minX + intercept],
        [maxX, slope * maxX + intercept],
      ],
      symbol: 'none',
      lineStyle: {
        type: 'dashed',
        width: trendlineWidth,
        color: trendlineColor,
      },
      tooltip: { show: false },
    }
  }

  if (!colorField) {
    const data = rows.map((r) => [Number(r.x ?? 0), Number(r.y ?? 0)])

    const series: Array<Record<string, unknown>> = [
      {
        type: 'scatter',
        data,
        symbolSize: pointSize,
        itemStyle: { opacity },
      },
    ]

    const trendlineSeries = buildTrendlineSeries(
      data as Array<[number, number]>,
    )
    if (trendlineSeries) {
      series.push(trendlineSeries)
    }

    return {
      data,
      series,
      xAxis: applyAxisStyle(
        {
          type: 'value',
          splitLine: {
            show: showGrid,
            lineStyle: { color: gridLineColor, width: gridLineWidth },
          },
        },
        styles,
        true,
        'x',
      ),
      yAxis: applyAxisStyle(
        {
          type: 'value',
          splitLine: {
            show: showGrid,
            lineStyle: { color: gridLineColor, width: gridLineWidth },
          },
        },
        styles,
        true,
        'y',
      ),
    }
  }

  const colorValues = [...new Set(rows.map((r) => labelValue(r.color)))]
  const series: Array<Record<string, unknown>> = colorValues.map((color) => {
    const filtered = rows.filter((r) => labelValue(r.color) === color)
    const data = filtered.map((r) => [Number(r.x ?? 0), Number(r.y ?? 0)])

    return {
      name: color,
      type: 'scatter',
      data,
      symbolSize: pointSize,
      itemStyle: { opacity },
    }
  })

  const allPoints = rows.map(
    (r) => [Number(r.x ?? 0), Number(r.y ?? 0)] as [number, number],
  )
  const trendlineSeries = buildTrendlineSeries(allPoints)
  if (trendlineSeries) {
    series.push(trendlineSeries)
  }

  return {
    data: rows,
    series,
    xAxis: applyAxisStyle(
      {
        type: 'value',
        splitLine: {
          show: showGrid,
          lineStyle: { color: gridLineColor, width: gridLineWidth },
        },
      },
      styles,
      true,
      'x',
    ),
    yAxis: applyAxisStyle(
      {
        type: 'value',
        splitLine: {
          show: showGrid,
          lineStyle: { color: gridLineColor, width: gridLineWidth },
        },
      },
      styles,
      true,
      'y',
    ),
  }
}

// --- Radar Transformer ---
function transformRadar(
  rows: Array<Record<string, unknown>>,
  channels: WidgetChannels,
  styles: WidgetStyles,
): TransformResult {
  const valueFields = getFieldsFromChannel(channels, 'values')
  if (valueFields.length === 0) return { data: rows }

  const measures = valueFields.map((f, idx) => ({
    name: f.name,
    key: `m_${idx}`,
  }))
  const maxima = measures.map(({ key }) => {
    const max = rows.reduce((acc, r) => Math.max(acc, Number(r[key] ?? 0)), 0)
    return max > 0 ? max : 1
  })

  const indicator = measures.map((m, idx) => ({
    name: m.name,
    max: maxima[idx],
  }))

  const showArea = (styles.showArea as boolean) ?? true
  const areaOpacity = (styles.areaOpacity as number) ?? 0.25
  const lineWidth = (styles.lineWidth as number) ?? 2
  const shape = (styles.shape as 'polygon' | 'circle') ?? 'polygon'
  const gridLineWidth = (styles.gridLineWidth as number) ?? 1
  const gridLineColor = (styles.gridLineColor as string) ?? 'hsl(var(--border))'

  const data = rows.map((r) => ({
    name: labelValue(r.series || 'All'),
    value: measures.map((m) => Number(r[m.key] ?? 0)),
  }))

  return {
    data,
    series: [
      {
        type: 'radar',
        data,
        lineStyle: { width: lineWidth },
        areaStyle: showArea ? { opacity: areaOpacity } : undefined,
      },
    ],
    options: {
      radar: {
        indicator,
        shape,
        splitLine: {
          lineStyle: { color: gridLineColor, width: gridLineWidth },
        },
        axisLine: { lineStyle: { color: gridLineColor, width: gridLineWidth } },
        splitArea: { show: false },
      },
    },
  }
}

// --- Heatmap Transformer ---
function transformHeatmap(
  rows: Array<Record<string, unknown>>,
  styles: WidgetStyles,
): TransformResult {
  const xValues = [...new Set(rows.map((r) => labelValue(r.x)))]
  const yValues = [...new Set(rows.map((r) => labelValue(r.y)))]
  const xIndex = new Map(xValues.map((v, i) => [v, i]))
  const yIndex = new Map(yValues.map((v, i) => [v, i]))

  const data = rows.map((r) => [
    xIndex.get(labelValue(r.x)) ?? 0,
    yIndex.get(labelValue(r.y)) ?? 0,
    Number(r.value ?? 0),
  ])

  const values = data.map((d) => d[2])
  const minVal = values.length > 0 ? Math.min(...values) : 0
  const maxVal = values.length > 0 ? Math.max(...values) : 0

  const colorScheme = (styles.colorScheme as string) || 'blues'
  const showLegend = (styles.showLegend as boolean) ?? true
  const showBorder = (styles.showBorder as boolean) ?? true
  const cellBorderWidth = (styles.cellBorderWidth as number) ?? 1
  const cellBorderColor =
    (styles.cellBorderColor as string) ?? 'rgba(0,0,0,0.08)'
  const showLabels = (styles.showLabels as boolean) ?? false
  const percentageMode = (styles.percentageMode as string) ?? 'none'
  const legendFontSize = (styles.legendFontSize as number) ?? 12
  const legendBold = (styles.legendBold as boolean) ?? false
  const legendItalic = (styles.legendItalic as boolean) ?? false
  const legendUnderline = (styles.legendUnderline as boolean) ?? false
  const legendColor = (styles.legendColor as string) ?? 'hsl(var(--foreground))'
  const legendAlign =
    (styles.legendAlign as 'left' | 'center' | 'right') ?? 'center'
  const visualMapLeft =
    legendAlign === 'left' ? 0 : legendAlign === 'right' ? 'right' : 'center'
  const total = values.reduce((sum, current) => sum + Number(current ?? 0), 0)

  const palettes: Record<string, string[]> = {
    blues: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
    greens: ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b'],
    reds: ['#fff5f0', '#fcbba1', '#fb6a4a', '#cb181d', '#67000d'],
    oranges: ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#7f2704'],
    purples: ['#fcfbfd', '#dadaeb', '#9e9ac8', '#6a51a3', '#3f007d'],
    diverging: ['#313695', '#74add1', '#ffffbf', '#f46d43', '#a50026'],
  }
  const palette = palettes[colorScheme] ?? palettes.blues
  const labelStyle = getLabelStyle(styles, 'inside')

  const labelFormatter = (params: unknown) => {
    const item = params as { data: [number, number, number] }
    const value = Number(item.data?.[2] ?? 0)
    if (percentageMode === 'percentage') {
      const pct = total > 0 ? (value / total) * 100 : 0
      return `${pct.toFixed(1)}%`
    }
    if (percentageMode === 'value_percentage') {
      const pct = total > 0 ? (value / total) * 100 : 0
      return `${formatNumberValue(value, styles)} (${pct.toFixed(1)}%)`
    }
    return formatNumberValue(value, styles)
  }

  return {
    data,
    series: [
      {
        type: 'heatmap',
        data,
        label: {
          ...labelStyle,
          show: showLabels,
          formatter: labelFormatter,
        },
        itemStyle: {
          borderWidth: showBorder ? cellBorderWidth : 0,
          borderColor: cellBorderColor,
        },
      },
    ],
    xAxis: { type: 'category', data: xValues },
    yAxis: { type: 'category', data: yValues },
    options: {
      legend: { show: false },
      visualMap: {
        show: showLegend,
        min: minVal,
        max: maxVal,
        calculable: false,
        orient: 'horizontal',
        left: visualMapLeft,
        bottom: '0%',
        inRange: { color: palette },
        textStyle: {
          fontSize: legendFontSize,
          fontWeight: legendBold ? 'bold' : 'normal',
          fontStyle: legendItalic ? 'italic' : 'normal',
          textDecoration: legendUnderline ? 'underline' : 'none',
          color: legendColor,
          align: legendAlign,
        },
      },
    },
  }
}

// --- Funnel Transformer ---
function transformFunnel(
  rows: Array<Record<string, unknown>>,
  styles: WidgetStyles,
): TransformResult {
  const sortMode =
    (styles.sortMode as 'ascending' | 'descending') || 'descending'
  const percentageMode = (styles.percentageMode as string) ?? 'value_percentage'
  const showLabels = (styles.showLabels as boolean) ?? true
  const labelPosition = (styles.labelPosition as string) ?? 'right'
  const showLabelLine = (styles.showLabelLine as boolean) ?? true
  const labelLineLength = (styles.labelLineLength as number) ?? 14
  const labelStyle = getLabelStyle(styles, labelPosition)
  const borderWidth = (styles.borderWidth as number) ?? 1
  const borderColor = (styles.borderColor as string) ?? 'hsl(var(--background))'

  const data = rows.map((r) => ({
    name: labelValue(r.stage),
    value: Number(r.value ?? 0),
  }))

  const sorted = [...data]
  if (sortMode === 'ascending') {
    sorted.sort((a, b) => a.value - b.value)
  } else {
    sorted.sort((a, b) => b.value - a.value)
  }
  const max = sorted.length > 0 ? sorted[0].value : 0

  return {
    data: sorted,
    series: [
      {
        type: 'funnel',
        data: sorted,
        gap: (styles.gap as number) ?? 2,
        itemStyle: {
          borderColor,
          borderWidth,
        },
        label: {
          ...labelStyle,
          show: showLabels,
          position: labelPosition,
          formatter: (params: unknown) => {
            const p = params as { name: string; value: number }
            const pct = max > 0 ? (p.value / max) * 100 : 0
            if (percentageMode === 'percentage') {
              return `${p.name}: ${pct.toFixed(1)}%`
            }
            if (percentageMode === 'value_percentage') {
              return `${p.name}: ${formatNumberValue(p.value, styles)} (${pct.toFixed(1)}%)`
            }
            return `${p.name}: ${formatNumberValue(p.value, styles)}`
          },
        },
        labelLine: {
          show: showLabels && showLabelLine && labelPosition !== 'inside',
          length: labelLineLength,
          length2: Math.max(0, Math.round(labelLineLength / 2)),
        },
      },
    ],
  }
}

// --- Sankey Transformer ---
function transformSankey(
  rows: Array<Record<string, unknown>>,
  styles: WidgetStyles,
): TransformResult {
  const rawLinks = rows
    .map((r) => ({
      source: labelValue(r.source),
      target: labelValue(r.target),
      value: Number(r.value ?? 0),
    }))
    .filter((l) => l.source && l.target && l.source !== l.target && l.value > 0)

  const linksSorted = [...rawLinks].sort((a, b) => b.value - a.value)
  const adjacency = new Map<string, Set<string>>()

  const hasPath = (from: string, to: string): boolean => {
    if (from === to) return true
    const visited = new Set<string>()
    const queue: string[] = [from]
    while (queue.length > 0) {
      const node = queue.shift()
      if (!node) continue
      if (node === to) return true
      if (visited.has(node)) continue
      visited.add(node)
      const next = adjacency.get(node)
      if (!next) continue
      for (const n of next) {
        if (!visited.has(n)) queue.push(n)
      }
    }
    return false
  }

  const links: Array<{ source: string; target: string; value: number }> = []
  for (const link of linksSorted) {
    // If target can already reach source, this edge would create a cycle.
    if (hasPath(link.target, link.source)) continue
    links.push(link)
    if (!adjacency.has(link.source)) adjacency.set(link.source, new Set())
    adjacency.get(link.source)?.add(link.target)
  }

  const nodes = new Set<string>()
  links.forEach((l) => {
    nodes.add(l.source)
    nodes.add(l.target)
  })

  const data = {
    nodes: Array.from(nodes).map((name) => ({ name })),
    links,
  }

  const nodeAlign = (styles.nodeAlign as string) || 'justify'
  const nodeWidth = (styles.nodeWidth as number) ?? 20
  const nodeGap = (styles.nodeGap as number) ?? 8
  const curveness = (styles.curveness as number) ?? 0.5

  return {
    data,
    series: [
      {
        type: 'sankey',
        data: data.nodes,
        links: data.links,
        emphasis: { focus: 'adjacency' },
        nodeAlign,
        nodeWidth,
        nodeGap,
        lineStyle: { color: 'gradient', curveness },
      },
    ],
  }
}

// --- Treemap Transformer ---
function transformTreemap(
  rows: Array<Record<string, unknown>>,
  channels: WidgetChannels,
  styles: WidgetStyles,
): TransformResult {
  const hierarchyFields = getFieldsFromChannel(channels, 'hierarchy')
  const levels = hierarchyFields.length
  const showLabels = (styles.showLabels as boolean) ?? true
  const borderWidth = (styles.borderWidth as number) ?? 2
  const showBorder = (styles.showBorder as boolean) ?? true
  const borderColor = (styles.borderColor as string) ?? 'hsl(var(--background))'
  const percentageMode = (styles.percentageMode as string) ?? 'none'
  const labelStyle = getLabelStyle(styles, 'inside')
  const total = rows.reduce((sum, row) => sum + Number(row.value ?? 0), 0)

  const formatTreemapLabel = (value: number, name: string) => {
    const percent = total > 0 ? (value / total) * 100 : 0
    if (percentageMode === 'percentage') {
      return `${name}\n${percent.toFixed(1)}%`
    }
    if (percentageMode === 'value_percentage') {
      return `${name}\n${formatNumberValue(value, styles)} (${percent.toFixed(1)}%)`
    }
    return `${name}\n${formatNumberValue(value, styles)}`
  }

  if (levels === 1) {
    const data = rows.map((r) => ({
      name: String(r.level_0 ?? ''),
      value: Number(r.value ?? 0),
    }))
    return {
      data,
      series: [
        {
          type: 'treemap',
          data,
          label: {
            ...labelStyle,
            show: showLabels,
            formatter: (params: unknown) => {
              const item = params as { name: string; value: number }
              return formatTreemapLabel(
                Number(item.value ?? 0),
                String(item.name ?? ''),
              )
            },
          },
          breadcrumb: { show: false },
          roam: false,
          nodeClick: false,
          itemStyle: {
            borderWidth: showBorder ? borderWidth : 0,
            borderColor,
          },
        },
      ],
    }
  }

  const buildTree = (
    rows: Array<Record<string, unknown>>,
    level: number,
  ): Array<{ name: string; value?: number; children?: Array<unknown> }> => {
    if (level >= levels) return []

    const key = `level_${level}`
    const groups = new Map<string, Array<Record<string, unknown>>>()

    rows.forEach((r) => {
      const name = String(r[key] ?? '')
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name)?.push(r)
    })

    return Array.from(groups.entries()).map(([name, items]) => {
      const totalValue = items.reduce((sum, r) => sum + Number(r.value ?? 0), 0)
      if (level === levels - 1) {
        return { name, value: totalValue }
      }
      return {
        name,
        value: totalValue,
        children: buildTree(items, level + 1),
      }
    })
  }

  const data = buildTree(rows, 0)
  return {
    data,
    series: [
      {
        type: 'treemap',
        data,
        label: {
          ...labelStyle,
          show: showLabels,
          formatter: (params: unknown) => {
            const item = params as { name: string; value: number }
            return formatTreemapLabel(
              Number(item.value ?? 0),
              String(item.name ?? ''),
            )
          },
        },
        breadcrumb: { show: false },
        roam: false,
        nodeClick: false,
        itemStyle: {
          borderWidth: showBorder ? borderWidth : 0,
          borderColor,
        },
      },
    ],
  }
}

// --- Boxplot Transformer ---
function transformBoxplot(
  rows: Array<Record<string, unknown>>,
  styles: WidgetStyles,
): TransformResult {
  const showOutliers = (styles.showOutliers as boolean) ?? true
  const showGrid = (styles.showGrid as boolean) ?? true
  const gridLineWidth = (styles.gridLineWidth as number) ?? 1
  const gridLineColor = (styles.gridLineColor as string) ?? 'hsl(var(--border))'
  const boxColor = (styles.boxColor as string) ?? 'hsl(var(--primary))'
  const boxBorderWidth = (styles.boxBorderWidth as number) ?? 1
  const boxBorderColor =
    (styles.boxBorderColor as string) ?? 'hsl(var(--foreground))'
  const outlierColor =
    (styles.outlierColor as string) ?? 'hsl(var(--destructive))'

  const boxRows = rows.filter((r) => String(r.kind ?? 'box') === 'box')
  const outlierRows = rows.filter((r) => String(r.kind ?? '') === 'outlier')

  const categories = boxRows.map((r) => labelValue(r.category))
  const boxData = boxRows.map((r) => [
    Number(r.min ?? 0),
    Number(r.q1 ?? 0),
    Number(r.median ?? 0),
    Number(r.q3 ?? 0),
    Number(r.max ?? 0),
  ])

  const orientation =
    (styles.orientation as 'vertical' | 'horizontal') || 'vertical'
  const boxWidth = (styles.boxWidth as number) ?? 50

  const categoryIndex = new Map(categories.map((c, i) => [c, i]))
  const outlierSeries =
    showOutliers && outlierRows.length > 0
      ? ([
          {
            type: 'scatter',
            data: outlierRows
              .map((r) => {
                const cat = labelValue(r.category)
                const idx = categoryIndex.get(cat)
                if (idx === undefined) return null
                const v = Number(r.outlier ?? 0)
                return orientation === 'vertical' ? [idx, v] : [v, idx]
              })
              .filter((v): v is [number, number] => v !== null),
            symbolSize: 6,
            itemStyle: { color: outlierColor },
            tooltip: { show: false },
          },
        ] as Array<Record<string, unknown>>)
      : []

  return {
    data: boxData,
    series: [
      {
        type: 'boxplot',
        data: boxData,
        boxWidth: [`${Math.max(10, boxWidth - 10)}%`, `${boxWidth}%`],
        itemStyle: {
          color: boxColor,
          borderWidth: boxBorderWidth,
          borderColor: boxBorderColor,
        },
      },
      ...outlierSeries,
    ],
    xAxis:
      orientation === 'vertical'
        ? applyAxisStyle(
            { type: 'category', data: categories },
            styles,
            false,
            'x',
          )
        : applyAxisStyle(
            {
              type: 'value',
              splitLine: {
                show: showGrid,
                lineStyle: { color: gridLineColor, width: gridLineWidth },
              },
            },
            styles,
            true,
            'x',
          ),
    yAxis:
      orientation === 'vertical'
        ? applyAxisStyle(
            {
              type: 'value',
              splitLine: {
                show: showGrid,
                lineStyle: { color: gridLineColor, width: gridLineWidth },
              },
            },
            styles,
            true,
            'y',
          )
        : applyAxisStyle(
            { type: 'category', data: categories },
            styles,
            false,
            'y',
          ),
  }
}

// --- Combo Transformer ---
function transformCombo(
  rows: Array<Record<string, unknown>>,
  channels: WidgetChannels,
  styles: WidgetStyles,
): TransformResult {
  const barFields = getFieldsFromChannel(channels, 'bars')
  const lineFields = getFieldsFromChannel(channels, 'lines').slice(0, 1)

  const categories = rows.map((r) => labelValue(r.x))
  const series: Array<Record<string, unknown>> = []

  const showGrid = (styles.showGrid as boolean) ?? true
  const lineWidth = (styles.lineWidth as number) ?? 2
  const gridLineWidth = (styles.gridLineWidth as number) ?? 1
  const gridLineColor = (styles.gridLineColor as string) ?? 'hsl(var(--border))'
  const barWidth =
    typeof styles.barWidth === 'number' ? `${styles.barWidth}%` : undefined
  const borderRadius =
    typeof styles.borderRadius === 'number' ? styles.borderRadius : 0
  const barOpacity =
    typeof styles.barOpacity === 'number' ? styles.barOpacity : 1
  const barBorderWidth =
    typeof styles.barBorderWidth === 'number' ? styles.barBorderWidth : 0
  const barBorderColor = (styles.barBorderColor as string) ?? 'transparent'

  const stackMode = (styles.stackMode as boolean) ?? false
  const isStacked = stackMode

  barFields.forEach((field, idx) => {
    series.push({
      name: field.name,
      type: 'bar',
      data: rows.map((r) => r[`bar_${idx}`]),
      yAxisIndex: 0,
      stack: isStacked ? 'total' : undefined,
      barWidth,
      itemStyle: {
        borderRadius: [borderRadius, borderRadius, 0, 0],
        opacity: barOpacity,
        borderWidth: barBorderWidth,
        borderColor: barBorderColor,
      },
    })
  })

  lineFields.forEach((field, idx) => {
    series.push({
      name: field.name,
      type: 'line',
      data: rows.map((r) => r[`line_${idx}`]),
      yAxisIndex: 1,
      smooth: (styles.smooth as boolean) || false,
      showSymbol: (styles.showPoints as boolean) ?? true,
      lineStyle: { width: lineWidth },
    })
  })

  const yAxis: Array<Record<string, unknown>> = [
    applyAxisStyle(
      {
        type: 'value',
        position: 'left',
        splitLine: {
          show: showGrid,
          lineStyle: {
            color: gridLineColor,
            width: gridLineWidth,
          },
        },
        axisLabel: {
          formatter: (value: unknown) => formatNumberValue(value, styles),
        },
      },
      styles,
      true,
      'y',
    ),
  ]
  if (lineFields.length > 0) {
    yAxis.push(
      applyAxisStyle(
        {
          type: 'value',
          position: 'right',
          splitLine: { show: false },
          axisLabel: {
            formatter: (value: unknown) => formatNumberValue(value, styles),
          },
        },
        styles,
        true,
        'y',
      ),
    )
  }

  return {
    data: rows,
    series,
    xAxis: applyAxisStyle(
      {
        type: 'category',
        data: categories,
        axisTick: { show: false },
        splitLine: { show: false },
      },
      styles,
      false,
      'x',
    ),
    yAxis,
  }
}
