import type * as duckdb from '@duckdb/duckdb-wasm'
import type { SailorColumn, SailorProfile } from './sailorTypes'
import { queryToRows, sqlIdent } from '@/features/playground/_shared/duckdb'

const numericTypes = new Set([
  'TINYINT',
  'SMALLINT',
  'INTEGER',
  'BIGINT',
  'HUGEINT',
  'UTINYINT',
  'USMALLINT',
  'UINTEGER',
  'UBIGINT',
  'FLOAT',
  'DOUBLE',
  'REAL',
  'DECIMAL',
])

function getBaseType(duckdbType: string) {
  return duckdbType.toUpperCase().split('(')[0] ?? duckdbType.toUpperCase()
}

function getSemanticType(duckdbType: string): SailorColumn['semanticType'] {
  const baseType = getBaseType(duckdbType)

  if (numericTypes.has(baseType)) {
    return 'numeric'
  }

  if (baseType === 'BOOLEAN') {
    return 'boolean'
  }

  if (
    baseType === 'DATE' ||
    baseType === 'TIMESTAMP' ||
    baseType === 'TIMESTAMP_S' ||
    baseType === 'TIMESTAMP_MS' ||
    baseType === 'TIMESTAMP_NS'
  ) {
    return 'temporal'
  }

  return 'text'
}

export async function buildSailorProfile(args: {
  conn: duckdb.AsyncDuckDBConnection
  tableName: string
}): Promise<SailorProfile> {
  const describeRows = await queryToRows(
    args.conn,
    `DESCRIBE ${sqlIdent(args.tableName)}`,
  )
  const columns: SailorColumn[] = describeRows
    .map((row) => ({
      name: typeof row.column_name === 'string' ? row.column_name : '',
      duckdbType: typeof row.column_type === 'string' ? row.column_type : '',
    }))
    .filter((column) => column.name && column.duckdbType)
    .map((column) => ({
      ...column,
      semanticType: getSemanticType(column.duckdbType),
    }))

  const countRows = await queryToRows(
    args.conn,
    `SELECT COUNT(*)::BIGINT AS row_count FROM ${sqlIdent(args.tableName)}`,
  )
  const rowCount = Number(countRows[0]?.row_count ?? 0)
  const sampleRows = await queryToRows(
    args.conn,
    `SELECT * FROM ${sqlIdent(args.tableName)} LIMIT 5`,
  )
  const numericColumns = columns.filter(
    (column) => column.semanticType === 'numeric',
  )
  const categoricalColumns = columns.filter(
    (column) => column.semanticType !== 'numeric',
  )
  const numericStats: SailorProfile['numericStats'] = {}
  const categoricalStats: SailorProfile['categoricalStats'] = {}

  for (const column of numericColumns) {
    const ident = sqlIdent(column.name)
    const rows = await queryToRows(
      args.conn,
      `SELECT
        COUNT(${ident})::BIGINT AS count,
        ROUND(AVG(${ident}), 4) AS mean,
        ROUND(STDDEV(${ident}), 4) AS std,
        MIN(${ident}) AS min,
        MAX(${ident}) AS max,
        ROUND(QUANTILE_CONT(${ident}, 0.5), 4) AS median,
        QUANTILE_CONT(${ident}, [0.25, 0.5, 0.75]) AS quantiles,
        ROUND(SKEWNESS(${ident}), 4) AS skewness,
        ROUND(KURTOSIS(${ident}), 4) AS kurtosis,
        COUNT(*) FILTER (WHERE ${ident} = 0)::BIGINT AS zero_counts,
        (COUNT(*)::BIGINT - COUNT(${ident})::BIGINT) AS null_count
      FROM ${sqlIdent(args.tableName)}`,
    )

    const row = rows[0] ?? {}
    const quantiles = Array.isArray(row.quantiles) ? row.quantiles : null

    numericStats[column.name] = {
      ...row,
      '25%': quantiles?.[0] ?? null,
      '50%': quantiles?.[1] ?? row.median ?? null,
      '75%': quantiles?.[2] ?? null,
    }

    const min = row.min === null ? Number.NaN : Number(row.min)
    const max = row.max === null ? Number.NaN : Number(row.max)

    if (Number.isFinite(min) && Number.isFinite(max)) {
      const histogramRows = await queryToRows(
        args.conn,
        `WITH bounds AS (
          SELECT
            MIN(${ident})::DOUBLE AS min_value,
            MAX(${ident})::DOUBLE AS max_value
          FROM ${sqlIdent(args.tableName)}
          WHERE ${ident} IS NOT NULL
        ),
        bins AS (
          SELECT
            CASE
              WHEN max_value = min_value THEN 0
              ELSE LEAST(
                9,
                GREATEST(
                  0,
                  FLOOR(((${ident}::DOUBLE - min_value) / (max_value - min_value)) * 10)::INTEGER
                )
              )
            END AS bin_index,
            COUNT(*)::BIGINT AS count
          FROM ${sqlIdent(args.tableName)}, bounds
          WHERE ${ident} IS NOT NULL
          GROUP BY 1
        )
        SELECT
          ROUND(min_value + ((max_value - min_value) * bin_index / 10), 4) AS lower_bound,
          ROUND(min_value + ((max_value - min_value) * (bin_index + 1) / 10), 4) AS upper_bound,
          count
        FROM bins, bounds
        ORDER BY bin_index`,
      )

      numericStats[column.name].histogramBins = histogramRows.map((bin) => ({
        label: `${bin.lower_bound} - ${bin.upper_bound}`,
        lowerBound: bin.lower_bound,
        upperBound: bin.upper_bound,
        count: bin.count,
      }))
    }
  }

  for (const column of categoricalColumns.slice(0, 20)) {
    const ident = sqlIdent(column.name)
    const baseRows = await queryToRows(
      args.conn,
      `SELECT
        COUNT(DISTINCT ${ident})::BIGINT AS unique_count,
        (COUNT(*)::BIGINT - COUNT(${ident})::BIGINT) AS null_count
      FROM ${sqlIdent(args.tableName)}`,
    )
    const topRows = await queryToRows(
      args.conn,
      `SELECT ${ident} AS value, COUNT(*)::BIGINT AS count
      FROM ${sqlIdent(args.tableName)}
      GROUP BY ${ident}
      ORDER BY count DESC
      LIMIT 5`,
    )

    categoricalStats[column.name] = {
      ...(baseRows[0] ?? {}),
      topValues: topRows,
    }
  }

  let correlation: SailorProfile['correlation'] = null

  if (numericColumns.length > 1 && numericColumns.length < 20) {
    correlation = {}

    for (const left of numericColumns) {
      correlation[left.name] = {}

      for (const right of numericColumns) {
        if (left.name === right.name) {
          correlation[left.name][right.name] = 1
          continue
        }

        const rows = await queryToRows(
          args.conn,
          `SELECT CORR(${sqlIdent(left.name)}, ${sqlIdent(
            right.name,
          )}) AS value FROM ${sqlIdent(args.tableName)}`,
        )
        const value = rows[0]?.value

        correlation[left.name][right.name] =
          typeof value === 'number' && Number.isFinite(value) ? value : 0
      }
    }
  } else if (numericColumns.length >= 20) {
    correlation = 'Skipped for datasets with 20 or more numeric columns.'
  }

  return {
    tableName: args.tableName,
    rowCount,
    columns,
    sampleRows,
    numericStats,
    categoricalStats,
    correlation,
  }
}
