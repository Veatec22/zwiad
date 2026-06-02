// Semantic & Analytic Types

/** Semantic type - describes what the data represents */
export type SemanticType = 'quantitative' | 'nominal' | 'ordinal' | 'temporal'

/** @deprecated Use SemanticType instead */
export type FieldSemanticType = SemanticType

/** Analytic type - Tableau terminology for dimension vs measure */
export type AnalyticType = 'dimension' | 'measure'

// Aggregation

/** Aggregation functions supported by DuckDB */
export type Aggregation =
  | 'sum'
  | 'avg'
  | 'count'
  | 'countDistinct'
  | 'min'
  | 'max'
  | 'median'
  | 'stddev'
  | 'variance'

// Field Types

/** Field from dataset schema (from DuckDB DESCRIBE) */
export interface DatasetField {
  name: string
  /** DuckDB type: VARCHAR, INTEGER, DOUBLE, TIMESTAMP, etc. */
  duckdbType: string
  semanticType: SemanticType
}

/** Field with analytic type derived */
export interface AnalyzedField extends DatasetField {
  analyticType: AnalyticType
}

// Data Types

/** Generic data row */
export interface DataRow {
  [key: string]: unknown
}

/** Chart data point for simple X/Y charts */
export interface XYPoint {
  x: string | number
  y: number
  /** Optional color category for grouped charts */
  color?: string
  /** Optional size value for scatter plots */
  size?: number
  /** Optional label for tooltips */
  label?: string
}

/** Chart data point for multi-series charts */
export interface SeriesPoint {
  x: string | number
  y: number
  series: string
}

// Utility function to derive analytic type from semantic type

export function deriveAnalyticType(semanticType: SemanticType): AnalyticType {
  return semanticType === 'quantitative' ? 'measure' : 'dimension'
}

// Filter Types

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'between'
  | 'isNull'
  | 'isNotNull'

export interface FilterRule {
  id: string
  /**
   * The Dataset this rule applies to (biwave-07, ADR-0005).
   * Rules whose `datasetId` does not match a Widget's `datasetId` are
   * silently skipped by the SQL composer. Optional in the type for
   * legacy callers; treat as required when authoring new rules.
   */
  datasetId?: string
  fieldName: string
  semanticType: SemanticType
  operator: FilterOperator
  value: unknown
  enabled: boolean
}

// Sort

export type SortDirection = 'asc' | 'desc' | 'none'
