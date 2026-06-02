import type { SailorColumn, SailorProfile } from '../sailorTypes'

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'bigint') {
    return Number(value)
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function isNullish(value: unknown) {
  return value === null || value === undefined || value === ''
}

function getValueLabel(value: unknown) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function isTemporalString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false
  }

  return Number.isFinite(Date.parse(value))
}

function inferSemanticType(values: unknown[]): SailorColumn['semanticType'] {
  const nonNullValues = values.filter((value) => !isNullish(value))

  if (nonNullValues.length === 0) {
    return 'text'
  }

  if (nonNullValues.every((value) => typeof value === 'boolean')) {
    return 'boolean'
  }

  if (nonNullValues.every((value) => asNumber(value) !== null)) {
    return 'numeric'
  }

  if (
    nonNullValues.every(
      (value) => typeof value === 'string' && isTemporalString(value),
    )
  ) {
    return 'temporal'
  }

  return 'text'
}

function getDuckdbType(semanticType: SailorColumn['semanticType']) {
  if (semanticType === 'numeric') return 'DOUBLE'
  if (semanticType === 'boolean') return 'BOOLEAN'
  if (semanticType === 'temporal') return 'TIMESTAMP'
  return 'VARCHAR'
}

function quantile(sorted: number[], probability: number) {
  if (sorted.length === 0) return null
  if (sorted.length === 1) return sorted[0] ?? null

  const index = (sorted.length - 1) * probability
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const lowerValue = sorted[lower]
  const upperValue = sorted[upper]

  if (lowerValue === undefined || upperValue === undefined) {
    return null
  }

  return lowerValue + (upperValue - lowerValue) * (index - lower)
}

function roundStat(value: number | null) {
  return value === null || !Number.isFinite(value)
    ? null
    : Number(value.toFixed(4))
}

function getHistogramBins(values: number[]) {
  if (values.length === 0) return []

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (min === max) {
    return [
      {
        label: `${roundStat(min)} - ${roundStat(max)}`,
        lowerBound: min,
        upperBound: max,
        count: values.length,
      },
    ]
  }

  const binCount = 10
  const bins = Array.from({ length: binCount }, (_, index) => {
    const lowerBound = min + ((max - min) * index) / binCount
    const upperBound = min + ((max - min) * (index + 1)) / binCount

    return {
      label: `${roundStat(lowerBound)} - ${roundStat(upperBound)}`,
      lowerBound,
      upperBound,
      count: 0,
    }
  })

  for (const value of values) {
    const index = Math.min(
      binCount - 1,
      Math.max(0, Math.floor(((value - min) / (max - min)) * binCount)),
    )
    const bin = bins[index]
    if (bin) bin.count += 1
  }

  return bins.filter((bin) => bin.count > 0)
}

function getNumericStats(values: unknown[], rowCount: number) {
  const numericValues = values
    .map((value) => asNumber(value))
    .filter((value): value is number => value !== null)
  const count = numericValues.length
  const nullCount = rowCount - count

  if (count === 0) {
    return {
      count: 0,
      mean: null,
      std: null,
      min: null,
      max: null,
      median: null,
      '25%': null,
      '50%': null,
      '75%': null,
      skewness: null,
      kurtosis: null,
      zero_counts: 0,
      null_count: nullCount,
      histogramBins: [],
    }
  }

  const sorted = [...numericValues].sort((a, b) => a - b)
  const mean = numericValues.reduce((sum, value) => sum + value, 0) / count
  const variance =
    count > 1
      ? numericValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        (count - 1)
      : 0
  const std = Math.sqrt(variance)
  const skewness =
    std > 0
      ? numericValues.reduce(
          (sum, value) => sum + ((value - mean) / std) ** 3,
          0,
        ) / count
      : null
  const kurtosis =
    std > 0
      ? numericValues.reduce(
          (sum, value) => sum + ((value - mean) / std) ** 4,
          0,
        ) / count
      : null
  const q1 = quantile(sorted, 0.25)
  const median = quantile(sorted, 0.5)
  const q3 = quantile(sorted, 0.75)

  return {
    count,
    mean: roundStat(mean),
    std: roundStat(std),
    min: sorted[0] ?? null,
    max: sorted.at(-1) ?? null,
    median: roundStat(median),
    '25%': roundStat(q1),
    '50%': roundStat(median),
    '75%': roundStat(q3),
    skewness: roundStat(skewness),
    kurtosis: roundStat(kurtosis),
    zero_counts: numericValues.filter((value) => value === 0).length,
    null_count: nullCount,
    histogramBins: getHistogramBins(numericValues),
  }
}

function getCategoricalStats(values: unknown[], rowCount: number) {
  const counts = new Map<string, { count: number; value: unknown }>()
  let nullCount = 0

  for (const value of values) {
    if (isNullish(value)) {
      nullCount += 1
    }

    const label = getValueLabel(value)
    const current = counts.get(label)
    counts.set(label, {
      count: (current?.count ?? 0) + 1,
      value,
    })
  }

  return {
    unique_count: counts.size,
    null_count: nullCount,
    topValues: [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    row_count: rowCount,
  }
}

export function buildResultProfile(args: {
  columns: string[]
  rows: Array<Record<string, unknown>>
}): SailorProfile {
  const rowCount = args.rows.length
  const columns = args.columns.map((name) => {
    const values = args.rows.map((row) => row[name])
    const semanticType = inferSemanticType(values)

    return {
      duckdbType: getDuckdbType(semanticType),
      name,
      semanticType,
    }
  })
  const numericStats: SailorProfile['numericStats'] = {}
  const categoricalStats: SailorProfile['categoricalStats'] = {}

  for (const column of columns) {
    const values = args.rows.map((row) => row[column.name])

    if (column.semanticType === 'numeric') {
      numericStats[column.name] = getNumericStats(values, rowCount)
    } else {
      categoricalStats[column.name] = getCategoricalStats(values, rowCount)
    }
  }

  return {
    tableName: 'query_results',
    rowCount,
    columns,
    sampleRows: args.rows.slice(0, 5),
    numericStats,
    categoricalStats,
    correlation: null,
  }
}
