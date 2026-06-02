import type { SailorColumn, SailorProfile } from '../sailorTypes'

export interface SailorProfileSummary {
  rows: number
  columns: number
  numeric: number
  text: number
  boolean: number
  temporal: number
}

export interface OverviewHistogramBin {
  label: string
  lowerBound: number
  upperBound: number
  count: number
}

export interface OverviewNumericStats {
  count: number | null
  mean: number | null
  std: number | null
  min: number | null
  max: number | null
  median: number | null
  q1: number | null
  q3: number | null
  skewness: number | null
  kurtosis: number | null
  zeroCount: number | null
  histogramBins: OverviewHistogramBin[]
}

export interface OverviewTopValue {
  label: string
  count: number
}

export interface SailorOverviewRow {
  name: string
  duckdbType: string
  semanticType: SailorColumn['semanticType']
  typeLabel: string
  nullCount: number
  completenessPercent: number
  uniqueCount: number | null
  numericStats: OverviewNumericStats | null
  topValues: OverviewTopValue[]
}

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

function getTypeSubtype(column: SailorColumn) {
  const baseType = column.duckdbType.toLowerCase()

  if (column.semanticType === 'numeric') {
    if (baseType.includes('decimal') || baseType.includes('numeric')) {
      return 'decimal'
    }

    if (
      baseType.includes('float') ||
      baseType.includes('double') ||
      baseType.includes('real')
    ) {
      return 'float'
    }

    if (baseType.includes('int')) {
      return 'integer'
    }

    return 'numeric'
  }

  if (column.semanticType === 'temporal') {
    if (baseType.includes('timestamp')) {
      return 'timestamp'
    }

    return 'date'
  }

  return null
}

function getTypeLabel(column: SailorColumn) {
  if (column.semanticType === 'numeric') {
    const subtype = getTypeSubtype(column)
    return `Numeric${subtype ? ` (${subtype})` : ''}`
  }

  if (column.semanticType === 'temporal') {
    const subtype = getTypeSubtype(column)
    return subtype === 'timestamp' ? 'Date (timestamp)' : 'Date'
  }

  if (column.semanticType === 'boolean') {
    return 'Boolean'
  }

  return 'Text'
}

function getTopValueLabel(value: unknown) {
  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  return String(value)
}

function getTopValues(stats: Record<string, unknown> | undefined) {
  const rawTopValues = stats?.topValues

  if (Array.isArray(rawTopValues)) {
    return rawTopValues
      .map((row) => {
        if (!row || typeof row !== 'object') {
          return null
        }

        const record = row as Record<string, unknown>
        const count = asNumber(record.count)

        if (count === null) {
          return null
        }

        return {
          label: getTopValueLabel(record.value),
          count,
        }
      })
      .filter((row): row is OverviewTopValue => row !== null)
  }

  const topFrequentValues = stats?.top_frequent_values

  if (topFrequentValues && typeof topFrequentValues === 'object') {
    return Object.entries(topFrequentValues as Record<string, unknown>)
      .map(([label, count]) => ({
        label,
        count: asNumber(count) ?? 0,
      }))
      .filter((row) => row.count > 0)
  }

  return []
}

function getNumericStats(stats: Record<string, unknown> | undefined) {
  if (!stats) {
    return null
  }

  const histogramBins = Array.isArray(stats.histogramBins)
    ? stats.histogramBins
        .map((bin) => {
          if (!bin || typeof bin !== 'object') {
            return null
          }

          const record = bin as Record<string, unknown>
          const lowerBound = asNumber(record.lowerBound)
          const upperBound = asNumber(record.upperBound)
          const count = asNumber(record.count)

          if (lowerBound === null || upperBound === null || count === null) {
            return null
          }

          return {
            label:
              typeof record.label === 'string'
                ? record.label
                : `${lowerBound} - ${upperBound}`,
            lowerBound,
            upperBound,
            count,
          }
        })
        .filter((bin): bin is OverviewHistogramBin => bin !== null)
    : []

  return {
    count: asNumber(stats.count),
    mean: asNumber(stats.mean),
    std: asNumber(stats.std),
    min: asNumber(stats.min),
    max: asNumber(stats.max),
    median: asNumber(stats.median) ?? asNumber(stats['50%']),
    q1: asNumber(stats['25%']),
    q3: asNumber(stats['75%']),
    skewness: asNumber(stats.skewness),
    kurtosis: asNumber(stats.kurtosis),
    zeroCount: asNumber(stats.zero_counts),
    histogramBins,
  }
}

export function getProfileSummary(
  profile: SailorProfile,
): SailorProfileSummary {
  return profile.columns.reduce<SailorProfileSummary>(
    (summary, column) => {
      summary[column.semanticType] += 1
      return summary
    },
    {
      rows: profile.rowCount,
      columns: profile.columns.length,
      numeric: 0,
      text: 0,
      boolean: 0,
      temporal: 0,
    },
  )
}

export function buildOverviewRows(profile: SailorProfile): SailorOverviewRow[] {
  return profile.columns.map((column) => {
    const numericStats = getNumericStats(profile.numericStats[column.name])
    const categoricalStats = profile.categoricalStats[column.name]
    const nullCount =
      asNumber(
        numericStats ? profile.numericStats[column.name]?.null_count : null,
      ) ??
      asNumber(categoricalStats?.null_count) ??
      Math.max(0, profile.rowCount - (numericStats?.count ?? profile.rowCount))
    const completenessPercent =
      profile.rowCount > 0
        ? Math.max(
            0,
            Math.min(
              100,
              ((profile.rowCount - nullCount) / profile.rowCount) * 100,
            ),
          )
        : 0

    return {
      name: column.name,
      duckdbType: column.duckdbType,
      semanticType: column.semanticType,
      typeLabel: getTypeLabel(column),
      nullCount,
      completenessPercent,
      uniqueCount: asNumber(categoricalStats?.unique_count),
      numericStats,
      topValues: getTopValues(categoricalStats),
    }
  })
}
