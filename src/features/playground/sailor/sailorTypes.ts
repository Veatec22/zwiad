export interface SailorColumn {
  name: string
  duckdbType: string
  semanticType: 'numeric' | 'text' | 'boolean' | 'temporal'
}

export interface SailorProfile {
  tableName: string
  rowCount: number
  columns: SailorColumn[]
  sampleRows: Array<Record<string, unknown>>
  numericStats: Record<string, Record<string, unknown>>
  categoricalStats: Record<string, Record<string, unknown>>
  correlation: Record<string, Record<string, number>> | string | null
}

export interface SailorDataset {
  tableName: string
  fileName: string
  profile: SailorProfile
}

export interface SuggestedExplorerQuery {
  title: string
  sql: string
  reason: string
}

export interface SuggestedDerivedFeature {
  name: string
  sqlExpression: string
  why: string
}

export interface SailorAiResponse {
  answer: string
  suggestedQueries: SuggestedExplorerQuery[]
  derivedFeatures: SuggestedDerivedFeature[]
}

export type SailorAiProviderId = 'openrouter' | 'webllm'

export interface SailorModel {
  id: string
  owner: string
  label: string
  name: string
  contextLength: number | null
  promptPrice: string
  completionPrice: string
}
