export type MaelTaskType = 'auto' | 'binary' | 'multiclass' | 'regression'
export type ResolvedMaelTaskType = Exclude<MaelTaskType, 'auto'>
export type MaelValidationStrategy = 'cv' | 'holdout'
export type MaelOrdering = 'random' | 'time'
export type MaelMissingStrategy =
  | 'drop_rows'
  | 'fill'
  | 'fill_with_indicator'
  | 'native'

export interface MaelColumnProfile {
  name: string
  dtype: string
  kind: 'numeric' | 'categorical'
  missing: number
  unique: number
  examples: string[]
  dateLike?: boolean
  min?: number
  max?: number
  median?: number
  categories?: string[]
}

export interface MaelDatasetProfile {
  columns: MaelColumnProfile[]
  rowCount: number
  columnCount: number
  suggestedTarget: string
  previewRows: Array<Record<string, string | number | null>>
}

export interface MaelTrainRequest {
  cvFolds: number
  csvText: string
  datasetName?: string
  excludedFeatures: string[]
  hyperparams: MaelHyperparams
  missingStrategy: MaelMissingStrategy
  ordering: MaelOrdering
  randomState: number
  reviewWarnings: MaelReviewFlag[]
  dateTransforms: MaelDateTransform[]
  target: string
  task: MaelTaskType
  timeColumn?: string
  validation: MaelValidationStrategy
}

export interface MaelMetric {
  label: string
  mean?: number
  std?: number
  value: number | string
}

export interface MaelFeatureField {
  name: string
  kind: 'numeric' | 'categorical'
  defaultValue: string | number
  min?: number
  max?: number
  categories?: string[]
}

export interface MaelTrainingResult {
  activeRunId: string
  bestIteration: number
  calibration?: MaelCalibrationCurve[]
  classes?: string[]
  confusionMatrix?: number[][]
  cvFolds?: number
  engine: 'xgboost'
  datasetName?: string
  evictedRunId?: string
  excludedFeatures: string[]
  featureImportance: Array<{ feature: string; importance: number }>
  fields: MaelFeatureField[]
  hyperparams: MaelHyperparams
  imbalance?: MaelImbalance | null
  imbalanceCorrected: boolean
  metrics: MaelMetricSets
  missingStrategy: MaelMissingStrategy
  ordering: MaelOrdering
  primaryMetric: MaelMetric
  prCurve?: MaelPrCurve[]
  probaCache?: number[][]
  reviewWarnings: MaelReviewFlag[]
  randomState: number
  rocCurve?: MaelRocCurve[]
  resolvedTask: ResolvedMaelTaskType
  rowCount: number
  runId: string
  runs: MaelRun[]
  shapImportance: MaelShapImportance[]
  suspiciousLeakageWarning: boolean
  target: string
  testRows: number
  timeColumn?: string
  trainRows: number
  validation: MaelValidationStrategy
  valRows: number
  visualization: {
    actual?: number[]
    predicted?: number[]
    residuals?: number[]
  }
  yTrueTest?: number[]
}

export interface MaelRun {
  bestIteration: number
  cvFolds?: number
  datasetHash: string
  datasetName?: string
  excludedFeatures: string[]
  isPreviousDataset: boolean
  hyperparams: MaelHyperparams
  imbalanceCorrected: boolean
  pinned: boolean
  primaryMetric?: MaelMetric
  randomState: number
  resolvedTask: ResolvedMaelTaskType
  reviewWarningCount: number
  hasLeakageWarning: boolean
  runId: string
  missingStrategy: MaelMissingStrategy
  ordering: MaelOrdering
  target: string
  timeColumn?: string
  testPrimaryMetric?: MaelMetric
  timestamp: string
  validation: MaelValidationStrategy
}

export interface MaelMetricSets {
  cv?: MaelMetric[]
  test?: MaelMetric[]
  val?: MaelMetric[]
}

export interface MaelHyperparams {
  class_weight_balanced: boolean
  colsample_bytree: number
  gamma: number
  learning_rate: number
  max_depth: number
  min_child_weight: number
  n_estimators: number
  reg_alpha: number
  reg_lambda: number
  scale_pos_weight: number
  subsample: number
}

export interface MaelImbalance {
  minorityClass: string
  ratio: number
  suggestedScalePosWeight: number
}

export interface MaelReviewFlag {
  code:
    | 'constant'
    | 'date_named'
    | 'high_cardinality'
    | 'id_like'
    | 'target_leakage'
  feature: string
  message: string
  severity: 'info' | 'warning'
  suggestedAction:
    | 'auto-drop'
    | 'convert-date-features'
    | 'drop-or-accept'
    | 'exclude'
}

export interface MaelDateTransform {
  column: string
  features: MaelDateFeature[]
  keepOriginal: boolean
}

export type MaelDateFeature =
  | 'day'
  | 'dayofweek'
  | 'hour'
  | 'is_weekend'
  | 'month'
  | 'year'

export interface MaelDateExtractionResult {
  csvText: string
  excludedFeatures: string[]
  profile: MaelDatasetProfile
  transform: MaelDateTransform
}

export interface MaelPredictionResult {
  bias: number
  classContribs?: Array<{
    bias: number
    class: string
    contribs: MaelPredictionContribution[]
  }>
  contribs: MaelPredictionContribution[]
  prediction: string | number
  probabilities?: Array<{
    label: string
    probability: number
    gapToWinner: number
  }>
  runId: string
}

export type MaelContributionResult = Pick<
  MaelPredictionResult,
  'bias' | 'classContribs' | 'contribs' | 'runId'
>

export interface MaelPredictionContribution {
  contribution: number
  feature: string
}

export interface MaelShapImportance {
  contributions: number[]
  feature: string
  meanAbs: number
}

export interface MaelRocCurve {
  auc: number
  class: string
  fpr: number[]
  tpr: number[]
}

export interface MaelPrCurve {
  ap: number
  class: string
  precision: number[]
  recall: number[]
}

export interface MaelCalibrationCurve {
  class: string
  fractionPositive: number[]
  meanPredicted: number[]
}

export interface MaelBatchPredictionResult {
  columns: string[]
  distribution?: Array<{
    count: number
    label: string
  }>
  predictionColumn: string
  probabilityColumn?: string
  probabilityColumns?: string[]
  rowCount: number
  rows: Array<Record<string, string | number | null>>
  runId: string
}

export interface MaelExportRunResult {
  metadata: {
    classes?: string[]
    createdAt: string
    datasetHash: string
    datasetName?: string
    dateTransforms?: MaelDateTransform[]
    engine: 'xgboost'
    excludedFeatures: string[]
    features: MaelFeatureField[]
    hyperparameters: MaelHyperparams
    metrics: MaelMetricSets
    missingIndicators?: Record<string, string>
    missingStrategy: MaelMissingStrategy
    ordering: MaelOrdering
    schemaVersion: 1
    target: string
    task: ResolvedMaelTaskType
    timeColumn?: string
    xgboostVersion: string
  }
  modelJson: string
}
