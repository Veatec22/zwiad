import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import JSZip from 'jszip'
import {
  Download,
  FileUp,
  FlaskConical,
  Info,
  Loader2,
  Pin,
  PinOff,
  Play,
  SlidersHorizontal,
  Upload,
} from 'lucide-react'
import type { ChangeEvent, RefObject } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { compareRunToActive } from './maelRunComparison'
import type {
  MaelBatchPredictionResult,
  MaelColumnProfile,
  MaelContributionResult,
  MaelDatasetProfile,
  MaelDateFeature,
  MaelDateTransform,
  MaelExportRunResult,
  MaelFeatureField,
  MaelHyperparams,
  MaelMissingStrategy,
  MaelOrdering,
  MaelPredictionResult,
  MaelReviewFlag,
  MaelRun,
  MaelTaskType,
  MaelTrainingResult,
  MaelValidationStrategy,
} from './maelTypes'
import { MaelWorkerClient } from './maelWorkerClient'

const maxFileBytes = 25 * 1024 * 1024
type MaelNumericHyperparamKey = Exclude<
  keyof MaelHyperparams,
  'class_weight_balanced'
>

const sampleDatasets = [
  {
    description: 'Balanced binary churn with numeric and categorical signals.',
    file: 'customer_churn.csv',
    id: 'customer_churn',
    name: 'Customer churn',
  },
  {
    description: 'Multiclass wine quality with compact physicochemical fields.',
    file: 'wine_quality.csv',
    id: 'wine_quality',
    name: 'Wine quality',
  },
  {
    description: 'Regression sample with location, size, and property mix.',
    file: 'house_prices.csv',
    id: 'house_prices',
    name: 'House prices',
  },
  {
    description: 'Imbalanced binary fraud sample with about 3% positives.',
    file: 'fraud_detection_mini.csv',
    id: 'fraud_detection_mini',
    name: 'Fraud detection mini',
  },
  {
    description: 'Loan approval sample designed for the Data review workflow.',
    file: 'loan_approvals_trap.csv',
    id: 'loan_approvals_trap',
    name: 'Loan approvals - TRAP edition',
  },
] as const

const dateFeatureOptions = [
  'year',
  'month',
  'day',
  'dayofweek',
  'hour',
  'is_weekend',
] as const satisfies MaelDateFeature[]

const hyperparamPresets = {
  conservative: {
    class_weight_balanced: false,
    colsample_bytree: 0.85,
    gamma: 0.2,
    learning_rate: 0.04,
    max_depth: 3,
    min_child_weight: 3,
    n_estimators: 60,
    reg_alpha: 0.1,
    reg_lambda: 1.5,
    scale_pos_weight: 1,
    subsample: 0.85,
  },
  balanced: {
    class_weight_balanced: false,
    colsample_bytree: 0.9,
    gamma: 0,
    learning_rate: 0.08,
    max_depth: 4,
    min_child_weight: 1,
    n_estimators: 80,
    reg_alpha: 0,
    reg_lambda: 1,
    scale_pos_weight: 1,
    subsample: 0.9,
  },
  aggressive: {
    class_weight_balanced: false,
    colsample_bytree: 1,
    gamma: 0,
    learning_rate: 0.12,
    max_depth: 6,
    min_child_weight: 1,
    n_estimators: 140,
    reg_alpha: 0,
    reg_lambda: 0.8,
    scale_pos_weight: 1,
    subsample: 1,
  },
} as const satisfies Record<string, MaelHyperparams>

const hyperparamGroups = [
  {
    labelKey: 'mael.hyperparams.groups.boosting',
    controls: [
      {
        key: 'n_estimators',
        max: 300,
        min: 20,
        step: 10,
        tooltipKey: 'mael.hyperparams.tooltips.n_estimators',
      },
      {
        key: 'learning_rate',
        max: 0.3,
        min: 0.01,
        step: 0.01,
        tooltipKey: 'mael.hyperparams.tooltips.learning_rate',
      },
    ],
  },
  {
    labelKey: 'mael.hyperparams.groups.tree',
    controls: [
      {
        key: 'max_depth',
        max: 10,
        min: 2,
        step: 1,
        tooltipKey: 'mael.hyperparams.tooltips.max_depth',
      },
      {
        key: 'min_child_weight',
        max: 12,
        min: 1,
        step: 0.5,
        tooltipKey: 'mael.hyperparams.tooltips.min_child_weight',
      },
      {
        key: 'gamma',
        max: 5,
        min: 0,
        step: 0.1,
        tooltipKey: 'mael.hyperparams.tooltips.gamma',
      },
    ],
  },
  {
    labelKey: 'mael.hyperparams.groups.sampling',
    controls: [
      {
        key: 'subsample',
        max: 1,
        min: 0.5,
        step: 0.05,
        tooltipKey: 'mael.hyperparams.tooltips.subsample',
      },
      {
        key: 'colsample_bytree',
        max: 1,
        min: 0.5,
        step: 0.05,
        tooltipKey: 'mael.hyperparams.tooltips.colsample_bytree',
      },
    ],
  },
  {
    labelKey: 'mael.hyperparams.groups.regularization',
    controls: [
      {
        key: 'reg_alpha',
        max: 5,
        min: 0,
        step: 0.1,
        tooltipKey: 'mael.hyperparams.tooltips.reg_alpha',
      },
      {
        key: 'reg_lambda',
        max: 5,
        min: 0,
        step: 0.1,
        tooltipKey: 'mael.hyperparams.tooltips.reg_lambda',
      },
    ],
  },
] as const satisfies Array<{
  controls: Array<{
    key: MaelNumericHyperparamKey
    max: number
    min: number
    step: number
    tooltipKey: string
  }>
  labelKey: string
}>

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isLikelyIdColumn(column: MaelColumnProfile, rowCount: number) {
  return rowCount > 0 && column.unique / rowCount > 0.95
}

function getTargetOverrideWarning(
  task: MaelTaskType,
  targetColumn?: MaelColumnProfile,
) {
  if (!targetColumn || task === 'auto') {
    return null
  }

  if (task === 'binary' && targetColumn.unique !== 2) {
    return 'mael.targetOverrideWarnings.binary'
  }

  if (task === 'multiclass' && targetColumn.unique < 3) {
    return 'mael.targetOverrideWarnings.multiclass'
  }

  if (task === 'regression' && targetColumn.kind !== 'numeric') {
    return 'mael.targetOverrideWarnings.regression'
  }

  return null
}

function getMissingSummary(profile: MaelDatasetProfile) {
  const columnsWithMissing = profile.columns.filter(
    (column) => column.missing > 0,
  )
  return {
    columns: columnsWithMissing.length,
    total: columnsWithMissing.reduce((sum, column) => sum + column.missing, 0),
  }
}

function getReviewKey(flag: MaelReviewFlag) {
  return `${flag.code}:${flag.feature}`
}

function formatMetricValue(value: number | string) {
  return typeof value === 'number' ? value.toFixed(4) : value
}

function formatMetric(metric: {
  mean?: number
  std?: number
  value: number | string
}) {
  if (typeof metric.mean === 'number' && typeof metric.std === 'number') {
    return `${metric.mean.toFixed(4)} ± ${metric.std.toFixed(4)}`
  }

  return formatMetricValue(metric.value)
}

function getDeltaClass(direction: 'improvement' | 'neutral' | 'regression') {
  if (direction === 'improvement') {
    return 'text-green-600'
  }
  if (direction === 'regression') {
    return 'text-red-600'
  }
  return 'text-muted-foreground'
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function getInitialValues(fields: MaelFeatureField[]) {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.defaultValue]),
  ) as Record<string, string | number>
}

function formatRunId(runId: string) {
  return `#${runId.replace(/^run-/, '')}`
}

function formatRunTimestamp(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCell(value: string | number | null) {
  if (value === null) {
    return ''
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(4)
  }

  return value
}

function csvEscape(value: string | number | null) {
  const text = formatCell(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadBatchCsv(result: MaelBatchPredictionResult) {
  const csv = [
    result.columns.map(csvEscape).join(','),
    ...result.rows.map((row) =>
      result.columns.map((column) => csvEscape(row[column] ?? null)).join(','),
    ),
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'mael-batch-predictions.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildPredictPy() {
  return `import json
import sys
from pathlib import Path

import pandas as pd
import xgboost as xgb

BASE_DIR = Path(__file__).resolve().parent
METADATA = json.loads((BASE_DIR / "metadata.json").read_text(encoding="utf-8"))
MODEL = xgb.Booster()
MODEL.load_model(str(BASE_DIR / "model.json"))


def _coerce_frame(df: pd.DataFrame) -> pd.DataFrame:
    for transform in METADATA.get("dateTransforms", []):
        column = transform["column"]
        if column not in df.columns:
            continue
        parsed = pd.to_datetime(df[column], errors="coerce")
        for feature in transform.get("features", []):
            name = f"{column}_{feature}"
            if feature == "year":
                df[name] = parsed.dt.year
            elif feature == "month":
                df[name] = parsed.dt.month
            elif feature == "day":
                df[name] = parsed.dt.day
            elif feature == "dayofweek":
                df[name] = parsed.dt.dayofweek
            elif feature == "hour":
                df[name] = parsed.dt.hour
            elif feature == "is_weekend":
                df[name] = parsed.dt.dayofweek.isin([5, 6]).astype(int)
    df = df.drop(columns=METADATA.get("excludedFeatures", []), errors="ignore")
    missing_strategy = METADATA.get("missingStrategy", "native")
    indicators = METADATA.get("missingIndicators", {})
    frame = {}

    for source, indicator in indicators.items():
        frame[indicator] = df[source].isna().astype(float) if source in df.columns else 1.0

    for field in METADATA["features"]:
        name = field["name"]
        if name in indicators.values():
            continue
        default = field.get("defaultValue")
        series = df[name] if name in df.columns else pd.Series([default] * len(df))

        if field["kind"] == "numeric":
            values = pd.to_numeric(series, errors="coerce")
            if missing_strategy in {"fill", "fill_with_indicator"}:
                values = values.fillna(default)
            frame[name] = values
        else:
            categories = field.get("categories") or []
            values = series.astype("string")
            if missing_strategy in {"fill", "fill_with_indicator"}:
                values = values.fillna(default)
            if categories:
                values = values.where(values.isin(categories), categories[0])
                frame[name] = pd.Categorical(values, categories=categories)
            else:
                frame[name] = values

    output = pd.DataFrame(frame)
    return output[[field["name"] for field in METADATA["features"]]]


def predict(record: dict) -> dict:
    df = pd.DataFrame([record])
    pred = MODEL.predict(xgb.DMatrix(_coerce_frame(df), enable_categorical=True))[0]
    classes = METADATA.get("classes") or []
    if METADATA["task"] == "regression":
        return {"prediction": float(pred)}
    if len(classes) == 2:
        probability = float(pred)
        return {
            "prediction": classes[1] if probability >= 0.5 else classes[0],
            f"probability_{classes[0]}": 1 - probability,
            f"probability_{classes[1]}": probability,
        }
    probabilities = [float(value) for value in pred]
    best = max(range(len(probabilities)), key=probabilities.__getitem__)
    result = {"prediction": classes[best] if best < len(classes) else str(best)}
    for index, value in enumerate(probabilities):
        label = classes[index] if index < len(classes) else str(index)
        result[f"probability_{label}"] = value
    return result


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python predict.py input.csv > out.csv")
    df = pd.read_csv(sys.argv[1])
    rows = [predict(row) for row in df.to_dict(orient="records")]
    pd.concat([df.reset_index(drop=True), pd.DataFrame(rows)], axis=1).to_csv(sys.stdout, index=False)


if __name__ == "__main__":
    main()
`
}

function buildBundleReadme(metadata: MaelExportRunResult['metadata']) {
  return `# MÆL prediction bundle

Dataset: ${metadata.datasetName ?? 'uploaded dataset'}
Target: ${metadata.target}
Task: ${metadata.task}

## Requirements

- Python 3.10+
- xgboost ${metadata.xgboostVersion}
- pandas

Install:

\`\`\`bash
pip install xgboost pandas
\`\`\`

Run:

\`\`\`bash
python predict.py input.csv > out.csv
\`\`\`
`
}

export function MaelCard() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchFileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<MaelWorkerClient | null>(null)
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [datasetName, setDatasetName] = useState<string | undefined>()
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null)
  const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false)
  const [trainedSampleIds, setTrainedSampleIds] = useState<Set<string>>(
    new Set(),
  )
  const [dateTransforms, setDateTransforms] = useState<MaelDateTransform[]>([])
  const [dateExtractionColumn, setDateExtractionColumn] = useState<
    string | null
  >(null)
  const [dateExtractionFeatures, setDateExtractionFeatures] = useState<
    MaelDateFeature[]
  >(['year', 'month', 'dayofweek', 'is_weekend'])
  const [keepOriginalDateColumn, setKeepOriginalDateColumn] = useState(false)
  const [profile, setProfile] = useState<MaelDatasetProfile | null>(null)
  const [target, setTarget] = useState('')
  const [task, setTask] = useState<MaelTaskType>('auto')
  const [excludedFeatures, setExcludedFeatures] = useState<string[]>([])
  const [randomState, setRandomState] = useState(42)
  const [validation, setValidation] =
    useState<MaelValidationStrategy>('holdout')
  const [missingStrategy, setMissingStrategy] =
    useState<MaelMissingStrategy>('native')
  const [ordering, setOrdering] = useState<MaelOrdering>('random')
  const [timeColumn, setTimeColumn] = useState('')
  const [reviewFlags, setReviewFlags] = useState<MaelReviewFlag[]>([])
  const [dismissedReviewFlags, setDismissedReviewFlags] = useState<Set<string>>(
    new Set(),
  )
  const [reviewPanelValue, setReviewPanelValue] = useState('')
  const [cvFolds, setCvFolds] = useState(5)
  const [hyperparams, setHyperparams] = useState<MaelHyperparams>(
    hyperparamPresets.balanced,
  )
  const [status, setStatus] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<
    'improvement' | 'neutral' | 'regression'
  >('neutral')
  const [error, setError] = useState<string | null>(null)
  const [isLoadingDataset, setIsLoadingDataset] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [isBatchPredicting, setIsBatchPredicting] = useState(false)
  const [batchFileName, setBatchFileName] = useState('')
  const [batchResult, setBatchResult] =
    useState<MaelBatchPredictionResult | null>(null)
  const [batchExplanation, setBatchExplanation] = useState<{
    result: MaelContributionResult
    row: Record<string, string | number | null>
  } | null>(null)
  const [batchExplanationCache, setBatchExplanationCache] = useState(
    new Map<string, MaelContributionResult>(),
  )
  const [isExplainingBatchRow, setIsExplainingBatchRow] = useState(false)
  const [trainingResult, setTrainingResult] =
    useState<MaelTrainingResult | null>(null)
  const [runs, setRuns] = useState<MaelRun[]>([])
  const [whatIfValues, setWhatIfValues] = useState<
    Record<string, string | number>
  >({})
  const [prediction, setPrediction] = useState<MaelPredictionResult | null>(
    null,
  )
  const [selectedContribClass, setSelectedContribClass] = useState('')
  const [importanceView, setImportanceView] = useState<'gain' | 'shap'>('shap')
  const [thresholdByRun, setThresholdByRun] = useState<Record<string, number>>(
    {},
  )
  const activeRun = runs.find(
    (run) => run.runId === trainingResult?.activeRunId,
  )
  const hyperparamTask = task === 'auto' ? trainingResult?.resolvedTask : task
  const targetColumn = profile?.columns.find((column) => column.name === target)
  const targetOverrideWarning = getTargetOverrideWarning(task, targetColumn)
  const missingSummary = profile ? getMissingSummary(profile) : null
  const dateColumns = useMemo(
    () => profile?.columns.filter((column) => column.dateLike) ?? [],
    [profile],
  )
  const activeReviewFlags = reviewFlags.filter(
    (flag) =>
      !dismissedReviewFlags.has(getReviewKey(flag)) &&
      !excludedFeatures.includes(flag.feature),
  )

  useEffect(() => {
    const worker = new MaelWorkerClient()
    workerRef.current = worker

    return () => {
      worker.dispose()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!workerRef.current || !csvText || !target) {
      setReviewFlags([])
      return
    }

    let cancelled = false
    workerRef.current
      .review({ csvText, excludedFeatures, target })
      .then((flags) => {
        if (cancelled) {
          return
        }
        setReviewFlags(flags)
        setReviewPanelValue(
          flags.some((flag) => flag.severity === 'warning')
            ? 'data-review'
            : '',
        )
      })
      .catch(() => {
        if (!cancelled) {
          setReviewFlags([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [csvText, excludedFeatures, target])

  const loadDataset = useCallback(
    async (args: { name: string; sampleId?: string; text: string }) => {
      if (!workerRef.current) {
        return
      }

      if (runs.length > 0 && !window.confirm(t('mael.datasetSwitchConfirm'))) {
        return
      }

      setIsLoadingDataset(true)
      setError(null)
      setStatus(t('mael.status.loading'))
      setStatusTone('neutral')
      setTrainingResult(null)
      setPrediction(null)
      setBatchResult(null)
      setBatchExplanation(null)
      setBatchExplanationCache(new Map())
      setBatchFileName('')
      setReviewFlags([])
      setDismissedReviewFlags(new Set())
      setDateTransforms([])

      try {
        const nextProfile = await workerRef.current.profile(args.text)
        setCsvText(args.text)
        setFileName(args.name)
        setDatasetName(args.name)
        setSelectedSampleId(args.sampleId ?? null)
        setProfile(nextProfile)
        setTarget(nextProfile.suggestedTarget)
        setOrdering('random')
        setTimeColumn('')
        setExcludedFeatures(
          nextProfile.columns
            .filter((column) => isLikelyIdColumn(column, nextProfile.rowCount))
            .map((column) => column.name),
        )
        setStatus(
          t('mael.status.loaded', {
            rows: nextProfile.rowCount,
            cols: nextProfile.columnCount,
          }),
        )
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : t('mael.errors.profileFailed'),
        )
      } finally {
        setIsLoadingDataset(false)
      }
    },
    [runs.length, t],
  )

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (file.size > maxFileBytes) {
      setError(
        t('mael.errors.csvLimit', { limit: formatFileSize(maxFileBytes) }),
      )
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError(t('mael.errors.csvOnly'))
      return
    }

    await loadDataset({
      name: file.name,
      text: await file.text(),
    })
  }

  const loadSampleDataset = useCallback(
    async (sample: (typeof sampleDatasets)[number]) => {
      const response = await fetch(`/playground/mael/datasets/${sample.file}`)
      if (!response.ok) {
        throw new Error(t('mael.errors.sampleFailed'))
      }

      await loadDataset({
        name: sample.name,
        sampleId: sample.id,
        text: await response.text(),
      })
      setIsSampleDialogOpen(false)
    },
    [loadDataset, t],
  )

  useEffect(() => {
    if (!workerRef.current || csvText) {
      return
    }

    const seen = window.localStorage.getItem('mael_seen')
    if (seen) {
      return
    }

    window.localStorage.setItem('mael_seen', '1')
    queueMicrotask(() => {
      void loadSampleDataset(sampleDatasets[0])
    })
  }, [csvText, loadSampleDataset])

  const train = async () => {
    if (!workerRef.current || !profile || !csvText || !target) {
      return
    }

    setIsTraining(true)
    setError(null)
    setPrediction(null)
    setStatus(t('mael.status.training'))
    setStatusTone('neutral')
    const previousActiveRun = activeRun

    if (targetOverrideWarning) {
      setError(t(targetOverrideWarning))
      setIsTraining(false)
      return
    }

    try {
      const result = await workerRef.current.train({
        csvText,
        datasetName,
        excludedFeatures,
        hyperparams,
        missingStrategy,
        ordering,
        randomState,
        reviewWarnings: activeReviewFlags,
        dateTransforms,
        target,
        task,
        timeColumn: ordering === 'time' ? timeColumn : undefined,
        validation,
        cvFolds,
      })
      setTrainingResult(result)
      setRuns(result.runs)
      if (selectedSampleId) {
        setTrainedSampleIds((current) => new Set(current).add(selectedSampleId))
      }
      setWhatIfValues(getInitialValues(result.fields))
      setBatchResult(null)
      setBatchExplanation(null)
      setBatchExplanationCache(new Map())
      setBatchFileName('')
      const nextRun = result.runs.find((run) => run.runId === result.runId)
      if (previousActiveRun && nextRun) {
        const delta = compareRunToActive(nextRun, previousActiveRun)
        setStatusTone(delta.direction)
        setStatus(
          delta.comparable
            ? `${t('mael.status.delta', {
                delta: delta.text,
                label: nextRun.primaryMetric?.label ?? '',
                nextRun: formatRunId(nextRun.runId),
                nextValue: nextRun.primaryMetric
                  ? formatMetric(nextRun.primaryMetric)
                  : '',
                previousRun: formatRunId(previousActiveRun.runId),
                previousValue: previousActiveRun.primaryMetric
                  ? formatMetric(previousActiveRun.primaryMetric)
                  : '',
              })}${
                delta.reason === 'different-random-state'
                  ? ` ${t('mael.status.deltaRandomStateWarning')}`
                  : ''
              }`
            : t('mael.status.deltaNotComparable'),
        )
      } else {
        setStatusTone('neutral')
        setStatus(
          result.evictedRunId
            ? t('mael.status.evicted', {
                runId: formatRunId(result.evictedRunId),
              })
            : t('mael.status.trained', {
                engine: result.engine,
                trainRows: result.trainRows,
                testRows: result.testRows,
                valRows: result.valRows,
              }),
        )
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t('mael.errors.trainingFailed'),
      )
    } finally {
      setIsTraining(false)
    }
  }

  const predict = async () => {
    if (!workerRef.current || !trainingResult) {
      return
    }

    setIsPredicting(true)
    setError(null)

    try {
      setPrediction(
        await workerRef.current.predict(
          whatIfValues,
          trainingResult.activeRunId,
        ),
      )
      setSelectedContribClass('')
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t('mael.errors.predictionFailed'),
      )
    } finally {
      setIsPredicting(false)
    }
  }

  const predictBatch = async (file: File | undefined) => {
    if (!workerRef.current || !trainingResult || !file) {
      return
    }

    if (file.size > maxFileBytes) {
      setError(
        t('mael.errors.csvLimit', { limit: formatFileSize(maxFileBytes) }),
      )
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError(t('mael.errors.csvOnly'))
      return
    }

    setIsBatchPredicting(true)
    setError(null)
    setBatchResult(null)
    setBatchExplanation(null)
    setBatchFileName(file.name)

    try {
      const result = await workerRef.current.predictBatch(
        await file.text(),
        trainingResult.activeRunId,
      )
      setBatchResult(result)
      setBatchExplanationCache(new Map())
      setStatus(
        t('mael.status.predicted', { count: result.rowCount, file: file.name }),
      )
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t('mael.errors.batchFailed'),
      )
    } finally {
      setIsBatchPredicting(false)
    }
  }

  const updateWhatIfValue = (name: string, value: string) => {
    setWhatIfValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const updateHyperparam = (key: MaelNumericHyperparamKey, value: number) => {
    setHyperparams((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const applyImbalanceSuggestion = () => {
    if (!trainingResult?.imbalance) {
      return
    }

    setHyperparams((current) =>
      trainingResult.resolvedTask === 'binary'
        ? {
            ...current,
            scale_pos_weight:
              trainingResult.imbalance?.suggestedScalePosWeight ?? 1,
          }
        : {
            ...current,
            class_weight_balanced: true,
          },
    )
  }

  const activateRun = async (runId: string) => {
    if (!workerRef.current) {
      return
    }

    setError(null)
    setPrediction(null)
    setBatchResult(null)
    setBatchExplanation(null)
    setBatchFileName('')

    try {
      const result = await workerRef.current.setActiveRun(runId)
      setTrainingResult(result)
      setRuns(result.runs)
      setWhatIfValues(getInitialValues(result.fields))
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t('mael.errors.runFailed'),
      )
    }
  }

  const toggleRunPinned = async (run: MaelRun) => {
    if (!workerRef.current) {
      return
    }

    setError(null)

    try {
      const result = await workerRef.current.setRunPinned(
        run.runId,
        !run.pinned,
      )
      setTrainingResult(result)
      setRuns(result.runs)
      if (result.evictedRunId) {
        setStatus(
          t('mael.status.evicted', { runId: formatRunId(result.evictedRunId) }),
        )
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t('mael.errors.runFailed'),
      )
    }
  }

  const downloadRunBundle = async (run: MaelRun) => {
    if (!workerRef.current) {
      return
    }

    setError(null)
    try {
      const bundle = await workerRef.current.exportRun(run.runId)
      const zip = new JSZip()
      zip.file('model.json', bundle.modelJson)
      zip.file('metadata.json', JSON.stringify(bundle.metadata, null, 2))
      zip.file('predict.py', buildPredictPy())
      zip.file('README.md', buildBundleReadme(bundle.metadata))
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dataset = slugify(bundle.metadata.datasetName ?? 'mael-dataset')
      const stamp = bundle.metadata.createdAt.slice(0, 19).replace(/[:T]/g, '')
      link.href = url
      link.download = `${dataset}-${run.runId}-${stamp}.zip`
      link.click()
      URL.revokeObjectURL(url)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t('mael.errors.exportFailed'),
      )
    }
  }

  const extractDateFeatures = async () => {
    if (!workerRef.current || !dateExtractionColumn || !csvText) {
      return
    }

    setError(null)
    try {
      const result = await workerRef.current.extractDateFeatures({
        column: dateExtractionColumn,
        csvText,
        options: {
          features: dateExtractionFeatures,
          keepOriginal: keepOriginalDateColumn,
        },
      })
      setCsvText(result.csvText)
      setProfile(result.profile)
      setDateTransforms((current) => [
        ...current.filter((item) => item.column !== result.transform.column),
        result.transform,
      ])
      setExcludedFeatures((current) =>
        Array.from(new Set([...current, ...result.excludedFeatures])),
      )
      setDateExtractionColumn(null)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t('mael.errors.dateExtractionFailed'),
      )
    }
  }

  const explainBatchRow = async (
    row: Record<string, string | number | null>,
    rowKey: string,
  ) => {
    if (!workerRef.current || !trainingResult) {
      return
    }

    const cached = batchExplanationCache.get(rowKey)
    if (cached) {
      setBatchExplanation({ result: cached, row })
      return
    }

    setIsExplainingBatchRow(true)
    setError(null)

    try {
      const values = Object.fromEntries(
        Object.entries(row).filter(
          ([, value]) => typeof value === 'string' || typeof value === 'number',
        ),
      ) as Record<string, string | number>
      const result = await workerRef.current.predictContribsRow(
        values,
        trainingResult.activeRunId,
      )
      setBatchExplanationCache((current) => {
        const next = new Map(current)
        next.set(rowKey, result)
        return next
      })
      setBatchExplanation({ result, row })
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t('mael.errors.predictionFailed'),
      )
    } finally {
      setIsExplainingBatchRow(false)
    }
  }

  return (
    <section className="grid h-full min-h-[720px] grid-cols-[280px_minmax(0,1fr)_420px] overflow-hidden rounded-xl border border-border bg-background">
      <aside className="min-h-0 overflow-auto border-border border-r bg-muted/20 p-4">
        <div className="grid content-start gap-4">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 font-medium text-sm">
              <FileUp aria-hidden="true" size={16} />
              {t('mael.dataset')}
            </div>
            <div className="grid gap-2">
              <Button
                disabled={isLoadingDataset}
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                {isLoadingDataset ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin"
                    size={17}
                  />
                ) : (
                  <Upload aria-hidden="true" size={17} />
                )}
                {t('mael.uploadCsv')}
              </Button>
              <Button
                disabled={isLoadingDataset}
                onClick={() => setIsSampleDialogOpen(true)}
                type="button"
                variant="outline"
              >
                <FlaskConical aria-hidden="true" size={17} />
                {t('mael.loadSample')}
              </Button>
              <input
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => void handleFileChange(event)}
                ref={fileInputRef}
                type="file"
              />
            </div>
            <p className="mt-3 text-muted-foreground text-xs leading-5">
              {t('mael.uploadHint', { limit: formatFileSize(maxFileBytes) })}
            </p>
          </div>

          {profile ? (
            <div className="rounded-md border border-border bg-background p-4">
              <p className="font-medium text-sm">{fileName}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-muted p-3">
                  <p className="text-muted-foreground text-xs">
                    {t('mael.metrics.rows')}
                  </p>
                  <p className="font-medium">{profile.rowCount}</p>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-muted-foreground text-xs">
                    {t('mael.metrics.columns')}
                  </p>
                  <p className="font-medium">{profile.columnCount}</p>
                </div>
              </div>
              {missingSummary && missingSummary.total > 0 ? (
                <p className="mt-3 rounded-md bg-muted p-3 text-muted-foreground text-xs">
                  {t('mael.missingSummary', {
                    total: missingSummary.total,
                    columns: missingSummary.columns,
                  })}
                </p>
              ) : null}
              <div className="mt-3 max-h-56 overflow-auto">
                {profile.columns.map((column) => {
                  const isTarget = column.name === target
                  const isExcluded = excludedFeatures.includes(column.name)
                  const isIdLike = isLikelyIdColumn(column, profile.rowCount)

                  return (
                    <div
                      className="flex items-center justify-between gap-3 border-border border-b py-2 text-xs last:border-b-0"
                      key={column.name}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {isTarget ? null : (
                          <input
                            aria-label={t('mael.useAsFeature', {
                              column: column.name,
                            })}
                            checked={!isExcluded}
                            className="size-4 accent-foreground"
                            onChange={(event) =>
                              setExcludedFeatures((current) =>
                                event.target.checked
                                  ? current.filter(
                                      (name) => name !== column.name,
                                    )
                                  : Array.from(
                                      new Set([...current, column.name]),
                                    ),
                              )
                            }
                            type="checkbox"
                          />
                        )}
                        <span className="truncate font-mono text-foreground">
                          {column.name}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {isTarget ? (
                          <Badge>{t('mael.targetBadge')}</Badge>
                        ) : null}
                        {isIdLike ? (
                          <Badge variant="outline">{t('mael.likelyId')}</Badge>
                        ) : null}
                        {column.dateLike ? (
                          <Badge variant="outline">{t('mael.dateLike')}</Badge>
                        ) : null}
                        {column.missing > 0 ? (
                          <Badge variant="outline">
                            {t('mael.missingCount', {
                              count: column.missing,
                            })}
                          </Badge>
                        ) : null}
                        <Badge variant="outline">{column.kind}</Badge>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="min-h-0 min-w-0 overflow-auto p-4">
        <section className="min-w-0 rounded-md border border-border">
          <div className="border-border border-b p-4">
            <div className="mb-3 flex items-center gap-2 font-medium text-sm">
              <SlidersHorizontal aria-hidden="true" size={16} />
              {t('mael.trainingSetup')}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 font-medium text-muted-foreground text-xs">
                {t('mael.target')}
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
                  disabled={!profile}
                  onChange={(event) => setTarget(event.target.value)}
                  value={target}
                >
                  {profile?.columns.map((column) => (
                    <option key={column.name} value={column.name}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="grid gap-1 font-medium text-muted-foreground text-xs"
                title={t('mael.targetTypeHint')}
              >
                {t('mael.task')}
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
                  onChange={(event) =>
                    setTask(event.target.value as MaelTaskType)
                  }
                  value={task}
                >
                  <option value="auto">{t('mael.taskAuto')}</option>
                  <option value="binary">{t('mael.taskBinary')}</option>
                  <option value="multiclass">{t('mael.taskMulticlass')}</option>
                  <option value="regression">{t('mael.taskRegression')}</option>
                </select>
              </label>
              <label
                className="grid gap-1 font-medium text-muted-foreground text-xs"
                title={t('mael.randomStateHint')}
              >
                {t('mael.randomState')}
                <input
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
                  min={0}
                  onChange={(event) =>
                    setRandomState(Number(event.target.value))
                  }
                  step={1}
                  type="number"
                  value={randomState}
                />
              </label>
            </div>
            {targetOverrideWarning ? (
              <p className="mt-3 rounded-md bg-amber-500/10 p-3 text-amber-700 text-sm">
                {t(targetOverrideWarning)}
              </p>
            ) : null}
            <label className="mt-4 grid gap-1 font-medium text-muted-foreground text-xs">
              {t('mael.missingValues')}
              <select
                className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
                onChange={(event) =>
                  setMissingStrategy(event.target.value as MaelMissingStrategy)
                }
                value={missingStrategy}
              >
                {(
                  [
                    'native',
                    'drop_rows',
                    'fill',
                    'fill_with_indicator',
                  ] as const
                ).map((strategy) => (
                  <option key={strategy} value={strategy}>
                    {t(`mael.missingStrategies.${strategy}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 grid gap-3 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-sm">
                  {t('mael.ordering.title')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['random', 'time'] as const).map((mode) => (
                    <Button
                      disabled={mode === 'time' && dateColumns.length === 0}
                      key={mode}
                      onClick={() => {
                        setOrdering(mode)
                        if (mode === 'time') {
                          const next = timeColumn || dateColumns[0]?.name || ''
                          setTimeColumn(next)
                          if (next) {
                            setExcludedFeatures((current) =>
                              current.includes(next)
                                ? current
                                : [...current, next],
                            )
                          }
                        }
                      }}
                      size="sm"
                      type="button"
                      variant={ordering === mode ? 'default' : 'outline'}
                    >
                      {t(`mael.ordering.${mode}`)}
                    </Button>
                  ))}
                </div>
              </div>
              {ordering === 'time' ? (
                <label className="grid gap-1 font-medium text-muted-foreground text-xs">
                  {t('mael.ordering.timeColumn')}
                  <select
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
                    onChange={(event) => {
                      const next = event.target.value
                      setTimeColumn(next)
                      setExcludedFeatures((current) =>
                        current.includes(next) ? current : [...current, next],
                      )
                    }}
                    value={timeColumn}
                  >
                    {dateColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-sm">
                  {t('mael.validation.title')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['holdout', 'cv'] as const).map((strategy) => (
                    <Button
                      key={strategy}
                      onClick={() => setValidation(strategy)}
                      size="sm"
                      type="button"
                      variant={validation === strategy ? 'default' : 'outline'}
                    >
                      {t(`mael.validation.${strategy}`)}
                    </Button>
                  ))}
                </div>
              </div>
              {validation === 'cv' ? (
                <label className="grid gap-1 font-medium text-muted-foreground text-xs">
                  {t('mael.validation.cvFolds', { count: cvFolds })}
                  <input
                    className="h-10 accent-foreground"
                    max={10}
                    min={3}
                    onChange={(event) => setCvFolds(Number(event.target.value))}
                    step={1}
                    type="range"
                    value={cvFolds}
                  />
                </label>
              ) : null}
              {validation === 'cv' && (profile?.rowCount ?? 0) > 10_000 ? (
                <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm">
                  {t('mael.validation.largeDatasetWarning', { folds: cvFolds })}
                </p>
              ) : null}
            </div>
            {reviewFlags.length > 0 ? (
              <Accordion
                className="mt-4"
                collapsible
                onValueChange={setReviewPanelValue}
                type="single"
                value={reviewPanelValue}
              >
                <AccordionItem
                  className="rounded-md border border-border px-3"
                  value="data-review"
                >
                  <AccordionTrigger>
                    {t('mael.dataReview.title', {
                      count: activeReviewFlags.length,
                    })}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2">
                      {activeReviewFlags.length > 0 ? (
                        activeReviewFlags.map((flag) => (
                          <div
                            className="grid gap-2 rounded-md bg-muted p-3 text-sm"
                            key={getReviewKey(flag)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className={
                                  flag.severity === 'warning'
                                    ? 'border-transparent bg-red-500/15 text-red-700'
                                    : undefined
                                }
                                variant="outline"
                              >
                                {flag.severity}
                              </Badge>
                              <span className="font-mono">{flag.feature}</span>
                              <span className="text-muted-foreground text-xs">
                                {flag.code}
                              </span>
                            </div>
                            <p className="text-muted-foreground">
                              {flag.message}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {flag.suggestedAction === 'exclude' ? (
                                <Button
                                  onClick={() =>
                                    setExcludedFeatures((current) =>
                                      Array.from(
                                        new Set([...current, flag.feature]),
                                      ),
                                    )
                                  }
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  {t('mael.dataReview.exclude')}
                                </Button>
                              ) : null}
                              {flag.code === 'date_named' ? (
                                <Button
                                  onClick={() => {
                                    setDateExtractionColumn(flag.feature)
                                    setDateExtractionFeatures([
                                      'year',
                                      'month',
                                      'dayofweek',
                                      'is_weekend',
                                    ])
                                    setKeepOriginalDateColumn(false)
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  {t('mael.dateExtraction.extract')}
                                </Button>
                              ) : null}
                              <Button
                                onClick={() =>
                                  setDismissedReviewFlags((current) => {
                                    const next = new Set(current)
                                    next.add(getReviewKey(flag))
                                    return next
                                  })
                                }
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                {t('mael.dataReview.dismiss')}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm">
                          {t('mael.dataReview.empty')}
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
            <Accordion className="mt-4" collapsible type="single">
              <AccordionItem
                className="rounded-md border border-border px-3"
                value="hyperparams"
              >
                <AccordionTrigger>
                  {t('mael.hyperparams.title')}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3">
                    <div className="flex flex-wrap gap-2">
                      {(
                        ['conservative', 'balanced', 'aggressive'] as const
                      ).map((preset) => (
                        <Button
                          key={preset}
                          onClick={() =>
                            setHyperparams(hyperparamPresets[preset])
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {t(`mael.hyperparams.presets.${preset}`)}
                        </Button>
                      ))}
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {hyperparamGroups.map((group) => (
                        <div className="grid gap-2" key={group.labelKey}>
                          <p className="text-muted-foreground text-xs">
                            {t(group.labelKey)}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {group.controls.map((control) => (
                              <label
                                className="grid gap-1 font-medium text-muted-foreground text-xs"
                                key={control.key}
                                title={t(control.tooltipKey)}
                              >
                                {control.key}
                                <input
                                  className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none"
                                  max={control.max}
                                  min={control.min}
                                  onChange={(event) =>
                                    updateHyperparam(
                                      control.key,
                                      Number(event.target.value),
                                    )
                                  }
                                  step={control.step}
                                  type="number"
                                  value={hyperparams[control.key]}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {hyperparamTask === 'binary' ? (
                      <label
                        className="grid gap-1 font-medium text-muted-foreground text-xs"
                        title={t('mael.hyperparams.tooltips.scale_pos_weight')}
                      >
                        scale_pos_weight
                        <input
                          className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none"
                          min={1}
                          onChange={(event) =>
                            updateHyperparam(
                              'scale_pos_weight',
                              Number(event.target.value),
                            )
                          }
                          step={0.1}
                          type="number"
                          value={hyperparams.scale_pos_weight}
                        />
                      </label>
                    ) : null}
                    {hyperparamTask === 'multiclass' ? (
                      <label className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
                        <input
                          checked={hyperparams.class_weight_balanced}
                          className="size-4 accent-foreground"
                          onChange={(event) =>
                            setHyperparams((current) => ({
                              ...current,
                              class_weight_balanced: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        {t('mael.hyperparams.classWeightBalanced')}
                      </label>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Button
              className="mt-4"
              disabled={!profile || !target || isTraining}
              onClick={() => void train()}
            >
              {isTraining ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <Play aria-hidden="true" size={17} />
              )}
              {t('mael.trainModel')}
            </Button>
          </div>

          <div className="grid gap-4 p-4">
            {error ? (
              <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm">
                {error}
              </p>
            ) : null}
            {status ? (
              <p className={`${getDeltaClass(statusTone)} text-sm leading-6`}>
                {status}
              </p>
            ) : null}
            {trainingResult?.suspiciousLeakageWarning ? (
              <p className="rounded-md bg-red-500/10 p-3 text-red-700 text-sm">
                {t('mael.suspiciousLeakageWarning')}
              </p>
            ) : null}
            {trainingResult?.ordering === 'time' &&
            trainingResult.resolvedTask !== 'regression' &&
            trainingResult.imbalance ? (
              <p className="rounded-md bg-amber-500/10 p-3 text-amber-700 text-sm">
                {t('mael.ordering.timeImbalanceWarning')}
              </p>
            ) : null}

            {trainingResult ? (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-muted-foreground text-xs">
                      {t('mael.metrics.task')}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {trainingResult.resolvedTask}
                      </p>
                      {trainingResult.imbalance ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button">
                              <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20">
                                {t('mael.imbalanceBadge', {
                                  ratio: (
                                    1 / trainingResult.imbalance.ratio
                                  ).toFixed(1),
                                })}
                              </Badge>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="grid max-w-80 gap-3">
                            <span>{t('mael.imbalanceHint')}</span>
                            <Button
                              onClick={applyImbalanceSuggestion}
                              size="sm"
                              type="button"
                            >
                              {trainingResult.resolvedTask === 'binary'
                                ? t('mael.applyScalePosWeight', {
                                    value:
                                      trainingResult.imbalance.suggestedScalePosWeight.toFixed(
                                        1,
                                      ),
                                  })
                                : t('mael.applyClassWeightBalanced')}
                            </Button>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                  <MetricTile
                    label={t('mael.metrics.trainRows')}
                    value={trainingResult.trainRows}
                  />
                  <MetricTile
                    label={t('mael.validation.title')}
                    value={
                      trainingResult.validation === 'cv'
                        ? `CV(${trainingResult.cvFolds ?? 5})`
                        : t('mael.validation.holdout')
                    }
                  />
                  <MetricTile
                    label={t('mael.missingValues')}
                    value={t(
                      `mael.missingStrategies.short.${trainingResult.missingStrategy}`,
                    )}
                  />
                </div>
                {trainingResult.validation === 'holdout' ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      <MetricTile
                        label={t('mael.metrics.valRows')}
                        value={trainingResult.valRows}
                      />
                      <MetricTile
                        label={t('mael.metrics.testRows')}
                        value={trainingResult.testRows}
                      />
                      <MetricTile
                        label={t('mael.metrics.bestIteration')}
                        value={t('mael.metrics.bestIterationValue', {
                          best: trainingResult.bestIteration,
                          max: trainingResult.hyperparams.n_estimators,
                        })}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <MetricGroup
                        metrics={trainingResult.metrics.val ?? []}
                        title={t('mael.metrics.val')}
                      />
                      <MetricGroup
                        metrics={trainingResult.metrics.test ?? []}
                        title={t('mael.metrics.test')}
                      />
                    </div>
                  </>
                ) : (
                  <MetricGroup
                    metrics={trainingResult.metrics.cv ?? []}
                    title={t('mael.metrics.cv')}
                  />
                )}

                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                  <div>
                    <FeatureImportancePanel
                      onViewChange={setImportanceView}
                      result={trainingResult}
                      view={importanceView}
                    />
                  </div>

                  <ModelDiagnostics
                    onThresholdChange={(threshold) =>
                      setThresholdByRun((current) => ({
                        ...current,
                        [trainingResult.runId]: threshold,
                      }))
                    }
                    result={trainingResult}
                    threshold={thresholdByRun[trainingResult.runId] ?? 0.5}
                  />
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('mael.trainHelp')}
              </p>
            )}
          </div>
        </section>
      </main>

      <aside className="min-h-0 overflow-auto border-border border-l p-4">
        <div className="grid gap-4">
          {runs.length > 0 ? (
            <LeaderboardPanel
              activeRun={activeRun ?? null}
              activeRunId={trainingResult?.activeRunId ?? null}
              onActivate={(runId) => void activateRun(runId)}
              onCloneParams={(run) => setHyperparams(run.hyperparams)}
              onDownload={(run) => void downloadRunBundle(run)}
              onTogglePin={(run) => void toggleRunPinned(run)}
              runs={runs}
            />
          ) : null}

          {trainingResult ? (
            activeRun?.isPreviousDataset ? (
              <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm leading-6">
                {t('mael.previousDatasetDisabled')}
              </p>
            ) : (
              <Tabs className="h-full min-h-0" defaultValue="what-if">
                <TabsList className="mb-3 grid w-full grid-cols-2">
                  <TabsTrigger value="what-if">
                    {t('mael.tabs.whatIf')}
                  </TabsTrigger>
                  <TabsTrigger value="batch">
                    {t('mael.tabs.batch')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent className="min-h-0" value="what-if">
                  <div className="mb-3 flex items-center gap-2 font-medium text-sm">
                    <FlaskConical aria-hidden="true" size={16} />
                    {t('mael.singlePrediction')}
                  </div>
                  <div className="max-h-[430px] overflow-auto pr-1">
                    <div className="grid gap-3">
                      {trainingResult.fields.map((field) => (
                        <WhatIfField
                          field={field}
                          key={field.name}
                          onChange={updateWhatIfValue}
                          value={whatIfValues[field.name] ?? ''}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    disabled={isPredicting}
                    onClick={() => void predict()}
                  >
                    {isPredicting ? (
                      <Loader2
                        aria-hidden="true"
                        className="animate-spin"
                        size={17}
                      />
                    ) : (
                      <FlaskConical aria-hidden="true" size={17} />
                    )}
                    {t('mael.predict')}
                  </Button>

                  {prediction ? (
                    <div className="mt-4 grid gap-4">
                      <div className="rounded-md bg-muted p-4 text-center">
                        <p className="text-muted-foreground text-xs">
                          {t('mael.predictionLabel')}
                        </p>
                        <p className="mt-1 font-semibold text-2xl">
                          {typeof prediction.prediction === 'number'
                            ? prediction.prediction.toFixed(4)
                            : prediction.prediction}
                        </p>
                      </div>
                      {prediction.probabilities ? (
                        <ProbabilityBars
                          probabilities={prediction.probabilities}
                        />
                      ) : null}
                      <ContributionChart
                        onClassChange={setSelectedContribClass}
                        prediction={prediction}
                        resolvedTask={trainingResult.resolvedTask}
                        selectedClass={selectedContribClass}
                      />
                    </div>
                  ) : null}
                </TabsContent>

                <TabsContent className="min-h-0" value="batch">
                  <BatchPredictionPanel
                    batchFileInputRef={batchFileInputRef}
                    batchFileName={batchFileName}
                    batchResult={batchResult}
                    isBatchPredicting={isBatchPredicting}
                    isExplainingRow={isExplainingBatchRow}
                    onDownload={downloadBatchCsv}
                    onExplainRow={(row, rowKey) =>
                      void explainBatchRow(row, rowKey)
                    }
                    onSelectFile={(file) => void predictBatch(file)}
                    resolvedTask={trainingResult.resolvedTask}
                  />
                </TabsContent>
              </Tabs>
            )
          ) : (
            <p className="text-muted-foreground text-sm leading-6">
              {t('mael.trainFirst')}
            </p>
          )}
        </div>
      </aside>
      <BatchExplanationDialog
        explanation={batchExplanation}
        onOpenChange={(open) => {
          if (!open) {
            setBatchExplanation(null)
          }
        }}
        resolvedTask={trainingResult?.resolvedTask ?? 'binary'}
      />
      <Dialog open={isSampleDialogOpen} onOpenChange={setIsSampleDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('mael.samples.title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            {sampleDatasets.map((sample) => (
              <button
                className="grid gap-2 rounded-md border border-border p-3 text-left hover:bg-muted"
                key={sample.id}
                onClick={() => void loadSampleDataset(sample)}
                type="button"
              >
                <span className="font-medium text-sm">{sample.name}</span>
                <span className="text-muted-foreground text-xs leading-5">
                  {sample.description}
                </span>
                {sample.id === 'loan_approvals_trap' &&
                trainedSampleIds.has(sample.id) ? (
                  <span className="rounded-md bg-amber-500/10 p-2 text-amber-700 text-xs leading-5">
                    {t('mael.samples.trapReveal')}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={dateExtractionColumn !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDateExtractionColumn(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('mael.dateExtraction.title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <p className="font-medium text-sm">
                {t('mael.dateExtraction.features')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {dateFeatureOptions.map((feature) => (
                  <label
                    className="flex items-center gap-2 text-sm"
                    key={feature}
                  >
                    <input
                      checked={dateExtractionFeatures.includes(feature)}
                      className="size-4 accent-foreground"
                      onChange={(event) =>
                        setDateExtractionFeatures((current) =>
                          event.target.checked
                            ? [...current, feature]
                            : current.filter((item) => item !== feature),
                        )
                      }
                      type="checkbox"
                    />
                    {t(`mael.dateExtraction.options.${feature}`)}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <p className="font-medium text-sm">
                {t('mael.dateExtraction.keepOriginal')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setKeepOriginalDateColumn(false)}
                  type="button"
                  variant={keepOriginalDateColumn ? 'outline' : 'default'}
                >
                  {t('mael.dateExtraction.drop')}
                </Button>
                <Button
                  onClick={() => setKeepOriginalDateColumn(true)}
                  type="button"
                  variant={keepOriginalDateColumn ? 'default' : 'outline'}
                >
                  {t('mael.dateExtraction.keep')}
                </Button>
              </div>
            </div>
            <Button
              disabled={dateExtractionFeatures.length === 0}
              onClick={() => void extractDateFeatures()}
              type="button"
            >
              {t('mael.dateExtraction.apply')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function LeaderboardPanel({
  activeRun,
  activeRunId,
  onActivate,
  onCloneParams,
  onDownload,
  onTogglePin,
  runs,
}: {
  activeRun: MaelRun | null
  activeRunId: string | null
  onActivate: (runId: string) => void
  onCloneParams: (run: MaelRun) => void
  onDownload: (run: MaelRun) => void
  onTogglePin: (run: MaelRun) => void
  runs: MaelRun[]
}) {
  const { t } = useTranslation()

  return (
    <section className="rounded-md border border-border">
      <div className="border-border border-b p-3">
        <p className="font-medium text-sm">{t('mael.leaderboard')}</p>
      </div>
      <div className="grid max-h-80 overflow-auto">
        {runs.map((run) => {
          const isActive = run.runId === activeRunId
          const delta = activeRun ? compareRunToActive(run, activeRun) : null

          return (
            <div
              className="grid gap-2 border-border border-b p-3 last:border-b-0"
              key={run.runId}
            >
              <button
                className="grid gap-1 text-left"
                onClick={() => onActivate(run.runId)}
                type="button"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono font-medium text-sm">
                    {formatRunId(run.runId)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatRunTimestamp(run.timestamp)}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {isActive ? <Badge>{t('mael.activeRun')}</Badge> : null}
                  {run.isPreviousDataset ? (
                    <Badge variant="outline">{t('mael.previousDataset')}</Badge>
                  ) : null}
                  <Badge variant="outline">{run.resolvedTask}</Badge>
                  <Badge variant="outline">
                    {run.validation === 'cv'
                      ? `CV(${run.cvFolds ?? 5})`
                      : t('mael.validation.holdout')}
                  </Badge>
                  <Badge variant="outline">
                    {t(`mael.missingStrategies.short.${run.missingStrategy}`)}
                  </Badge>
                  {run.ordering === 'time' ? (
                    <Badge variant="outline">
                      {t('mael.ordering.timeOrdered')}
                    </Badge>
                  ) : null}
                  {run.imbalanceCorrected ? (
                    <Badge className="bg-amber-500/15 text-amber-700">
                      {t('mael.imbalanceCorrected')}
                    </Badge>
                  ) : null}
                  {run.reviewWarningCount > 0 ? (
                    <Badge
                      className={
                        run.hasLeakageWarning
                          ? 'border-transparent bg-red-500/15 text-red-700'
                          : undefined
                      }
                      variant="outline"
                    >
                      {t('mael.trainedWithWarnings', {
                        count: run.reviewWarningCount,
                      })}
                    </Badge>
                  ) : null}
                  {delta ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          className={getDeltaClass(delta.direction)}
                          variant="outline"
                        >
                          Δ {delta.text}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {delta.reason === 'different-validation'
                          ? t('mael.deltaDifferentValidation')
                          : delta.reason === 'different-random-state'
                            ? t('mael.deltaRandomStateWarning')
                            : t('mael.deltaVsActive')}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-xs">
                  {run.target} ·{' '}
                  {run.primaryMetric
                    ? run.validation === 'cv'
                      ? `${run.primaryMetric.label} ${formatMetric(run.primaryMetric)}`
                      : `Val ${run.primaryMetric.label} ${formatMetric(
                          run.primaryMetric,
                        )}${
                          run.testPrimaryMetric
                            ? ` / Test ${formatMetric(run.testPrimaryMetric)}`
                            : ''
                        }`
                    : t('mael.noMetric')}
                </span>
              </button>
              <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label={t('mael.hyperparams.snapshot')}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Info aria-hidden="true" size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72">
                    <span className="font-mono text-[11px]">
                      {Object.entries(run.hyperparams)
                        .map(([key, value]) => `${key}=${value}`)
                        .join(', ')}
                    </span>
                  </TooltipContent>
                </Tooltip>
                <Button
                  onClick={() => onCloneParams(run)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t('mael.cloneParams')}
                </Button>
                <Button
                  onClick={() => onTogglePin(run)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {run.pinned ? (
                    <PinOff aria-hidden="true" size={14} />
                  ) : (
                    <Pin aria-hidden="true" size={14} />
                  )}
                  {run.pinned ? t('mael.unpinRun') : t('mael.pinRun')}
                </Button>
                <Button
                  aria-label={t('mael.downloadBundle')}
                  onClick={() => onDownload(run)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Download aria-hidden="true" size={14} />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ModelDiagnostics({
  onThresholdChange,
  result,
  threshold,
}: {
  onThresholdChange: (threshold: number) => void
  result: MaelTrainingResult
  threshold: number
}) {
  const { t } = useTranslation()

  if (result.resolvedTask === 'regression') {
    const actual = result.visualization.actual ?? []
    const predicted = result.visualization.predicted ?? []
    const points = actual
      .map((value, index) => [value, predicted[index]])
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))

    const values = points.flat()
    const min = Math.min(...values)
    const max = Math.max(...values)

    const option = {
      backgroundColor: 'transparent',
      grid: { bottom: 34, left: 46, right: 18, top: 24 },
      tooltip: { trigger: 'item' },
      xAxis: {
        axisLabel: { color: 'var(--fg-3)' },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        name: t('mael.chart.actual'),
        splitLine: { lineStyle: { color: 'var(--border)' } },
        type: 'value',
      },
      yAxis: {
        axisLabel: { color: 'var(--fg-3)' },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        name: t('mael.chart.predicted'),
        splitLine: { lineStyle: { color: 'var(--border)' } },
        type: 'value',
      },
      series: [
        {
          data: points,
          itemStyle: { color: 'var(--fg)' },
          symbolSize: 7,
          type: 'scatter',
        },
        {
          data: [
            [min, min],
            [max, max],
          ],
          lineStyle: { color: 'var(--fg-3)', type: 'dashed' },
          showSymbol: false,
          type: 'line',
        },
      ],
    } satisfies EChartsOption

    return (
      <div>
        <p className="mb-3 font-medium text-sm">{t('mael.regressionPlot')}</p>
        <div className="h-72 rounded-md border border-border p-2">
          {points.length > 0 ? (
            <ReactECharts
              lazyUpdate
              notMerge
              option={option}
              opts={{ renderer: 'canvas' }}
              style={{ height: '100%', width: '100%' }}
            />
          ) : (
            <p className="p-4 text-muted-foreground text-sm">
              {t('mael.noRegressionPoints')}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <ClassificationDiagnostics
      onThresholdChange={onThresholdChange}
      result={result}
      threshold={threshold}
    />
  )
}

function ConfusionMatrixPanel({ result }: { result: MaelTrainingResult }) {
  const { t } = useTranslation()
  const matrix = result.confusionMatrix ?? []
  const classes =
    result.classes && result.classes.length > 0
      ? result.classes
      : matrix.map((_, index) => String(index))
  const values = matrix.flat()
  const maxValue = Math.max(...values, 1)
  const heatmapData = matrix.flatMap((row, rowIndex) =>
    row.map((value, columnIndex) => [columnIndex, rowIndex, value]),
  )
  const actualLabel = t('mael.chart.actual')
  const predictedLabel = t('mael.chart.predicted')
  const option = {
    backgroundColor: 'transparent',
    grid: { bottom: 42, left: 58, right: 18, top: 20 },
    tooltip: {
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number] }
        return `${actualLabel} ${classes[p.data[1]]}<br/>${predictedLabel} ${classes[p.data[0]]}: ${p.data[2]}`
      },
      trigger: 'item',
    },
    visualMap: {
      inRange: {
        color: ['#27272a', '#71717a', '#fafafa'],
      },
      max: maxValue,
      min: 0,
      show: false,
    },
    xAxis: {
      axisLabel: { color: 'var(--fg-3)' },
      axisLine: { lineStyle: { color: 'var(--border)' } },
      data: classes,
      name: predictedLabel,
      type: 'category',
    },
    yAxis: {
      axisLabel: { color: 'var(--fg-3)' },
      axisLine: { lineStyle: { color: 'var(--border)' } },
      data: classes,
      inverse: true,
      name: actualLabel,
      type: 'category',
    },
    series: [
      {
        data: heatmapData,
        emphasis: {
          itemStyle: { borderColor: 'var(--fg)', borderWidth: 1 },
        },
        label: { color: 'var(--bg)', show: true },
        type: 'heatmap',
      },
    ],
  } satisfies EChartsOption

  return (
    <div>
      <p className="mb-3 font-medium text-sm">{t('mael.confusionMatrix')}</p>
      <div className="h-72 rounded-md border border-border p-2">
        {matrix.length > 0 ? (
          <ReactECharts
            lazyUpdate
            notMerge
            option={option}
            opts={{ renderer: 'canvas' }}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <p className="p-4 text-muted-foreground text-sm">
            {t('mael.noConfusionMatrix')}
          </p>
        )}
      </div>
    </div>
  )
}

function getThresholdMetrics(result: MaelTrainingResult, threshold: number) {
  const proba = result.probaCache ?? []
  const yTrue = result.yTrueTest ?? []
  let tn = 0
  let fp = 0
  let fn = 0
  let tp = 0

  for (let index = 0; index < proba.length; index += 1) {
    const probability = proba[index]?.[1] ?? 0
    const predicted = probability >= threshold ? 1 : 0
    const actual = yTrue[index] ?? 0
    if (actual === 1 && predicted === 1) tp += 1
    else if (actual === 0 && predicted === 0) tn += 1
    else if (actual === 0 && predicted === 1) fp += 1
    else if (actual === 1 && predicted === 0) fn += 1
  }

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp)
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn)
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall)

  return {
    matrix: [
      [tn, fp],
      [fn, tp],
    ],
    precision,
    recall,
    f1,
  }
}

function ClassificationDiagnostics({
  onThresholdChange,
  result,
  threshold,
}: {
  onThresholdChange: (threshold: number) => void
  result: MaelTrainingResult
  threshold: number
}) {
  const { t } = useTranslation()
  const thresholdMetrics = useMemo(
    () => getThresholdMetrics(result, threshold),
    [result, threshold],
  )

  if (result.resolvedTask === 'regression') {
    return null
  }

  return (
    <div>
      <p className="mb-3 font-medium text-sm">
        {t('mael.classificationDiagnostics')}
      </p>
      <Tabs defaultValue="confusion">
        <TabsList className="mb-3 grid w-full grid-cols-5">
          <TabsTrigger value="confusion">
            {t('mael.tabs.confusion')}
          </TabsTrigger>
          <TabsTrigger value="threshold">
            {t('mael.tabs.threshold')}
          </TabsTrigger>
          <TabsTrigger value="roc">{t('mael.tabs.roc')}</TabsTrigger>
          <TabsTrigger value="pr">{t('mael.tabs.pr')}</TabsTrigger>
          <TabsTrigger value="calibration">
            {t('mael.tabs.calibration')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="confusion">
          <ConfusionMatrixPanel result={result} />
        </TabsContent>
        <TabsContent value="threshold">
          {result.resolvedTask === 'binary' ? (
            <div className="grid gap-4">
              <label className="grid gap-1 font-medium text-muted-foreground text-xs">
                {t('mael.thresholdValue', { value: threshold.toFixed(2) })}
                <input
                  className="h-10 accent-foreground"
                  max={1}
                  min={0}
                  onChange={(event) =>
                    onThresholdChange(Number(event.target.value))
                  }
                  step={0.01}
                  type="range"
                  value={threshold}
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <MetricTile
                  label={t('mael.metrics.precision')}
                  value={thresholdMetrics.precision.toFixed(4)}
                />
                <MetricTile
                  label={t('mael.metrics.recall')}
                  value={thresholdMetrics.recall.toFixed(4)}
                />
                <MetricTile
                  label={t('mael.metrics.f1')}
                  value={thresholdMetrics.f1.toFixed(4)}
                />
              </div>
              <ConfusionMatrixTable matrix={thresholdMetrics.matrix} />
            </div>
          ) : (
            <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm">
              {t('mael.multiclassThresholdHint')}
            </p>
          )}
        </TabsContent>
        <TabsContent value="roc">
          <CurvePanel result={result} type="roc" />
        </TabsContent>
        <TabsContent value="pr">
          <CurvePanel result={result} type="pr" />
        </TabsContent>
        <TabsContent value="calibration">
          <CalibrationPanel result={result} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CalibrationPanel({ result }: { result: MaelTrainingResult }) {
  const { t } = useTranslation()
  const curves = useMemo(() => result.calibration ?? [], [result.calibration])
  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      grid: { bottom: 34, left: 46, right: 18, top: 24 },
      legend: {
        bottom: 0,
        textStyle: { color: 'var(--fg-2)', fontSize: 11 },
      },
      tooltip: { trigger: 'axis' },
      xAxis: {
        axisLabel: { color: 'var(--fg-3)' },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        max: 1,
        min: 0,
        name: t('mael.calibrationMeanPredicted'),
        splitLine: { lineStyle: { color: 'var(--border)' } },
        type: 'value',
      },
      yAxis: {
        axisLabel: { color: 'var(--fg-3)' },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        max: 1,
        min: 0,
        name: t('mael.calibrationFractionPositive'),
        splitLine: { lineStyle: { color: 'var(--border)' } },
        type: 'value',
      },
      series: [
        ...curves.map((curve) => ({
          data: curve.meanPredicted.map((x, index) => [
            x,
            curve.fractionPositive[index],
          ]),
          name: curve.class,
          showSymbol: true,
          type: 'line' as const,
        })),
        {
          data: [
            [0, 0],
            [1, 1],
          ],
          lineStyle: { color: 'var(--fg-3)', type: 'dashed' as const },
          name: t('mael.calibrationReference'),
          showSymbol: false,
          type: 'line' as const,
        },
      ],
    }),
    [curves, t],
  )

  if (curves.length === 0) {
    return (
      <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm">
        {t('mael.noCalibration')}
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="h-72 rounded-md border border-border p-2">
        <ReactECharts
          lazyUpdate
          notMerge
          option={option}
          opts={{ renderer: 'canvas' }}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
      <p className="text-muted-foreground text-xs leading-5">
        {t('mael.calibrationHint')}
      </p>
    </div>
  )
}

function CurvePanel({
  result,
  type,
}: {
  result: MaelTrainingResult
  type: 'pr' | 'roc'
}) {
  const { t } = useTranslation()
  const curves = useMemo(
    () => (type === 'roc' ? (result.rocCurve ?? []) : (result.prCurve ?? [])),
    [result.prCurve, result.rocCurve, type],
  )
  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      grid: { bottom: 34, left: 46, right: 18, top: 24 },
      legend: {
        bottom: 0,
        textStyle: { color: 'var(--fg-2)', fontSize: 11 },
      },
      tooltip: { trigger: 'axis' },
      xAxis: {
        axisLabel: { color: 'var(--fg-3)' },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        max: 1,
        min: 0,
        name: type === 'roc' ? 'FPR' : 'Recall',
        splitLine: { lineStyle: { color: 'var(--border)' } },
        type: 'value',
      },
      yAxis: {
        axisLabel: { color: 'var(--fg-3)' },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        max: 1,
        min: 0,
        name: type === 'roc' ? 'TPR' : 'Precision',
        splitLine: { lineStyle: { color: 'var(--border)' } },
        type: 'value',
      },
      series: [
        ...curves.map((curve) => ({
          data:
            type === 'roc'
              ? (
                  curve as NonNullable<MaelTrainingResult['rocCurve']>[number]
                ).fpr.map((x, index) => [
                  x,
                  (curve as NonNullable<MaelTrainingResult['rocCurve']>[number])
                    .tpr[index],
                ])
              : (
                  curve as NonNullable<MaelTrainingResult['prCurve']>[number]
                ).recall.map((x, index) => [
                  x,
                  (curve as NonNullable<MaelTrainingResult['prCurve']>[number])
                    .precision[index],
                ]),
          name: curve.class,
          showSymbol: false,
          type: 'line' as const,
        })),
        ...(type === 'roc'
          ? [
              {
                data: [
                  [0, 0],
                  [1, 1],
                ],
                lineStyle: { color: 'var(--fg-3)', type: 'dashed' as const },
                name: t('mael.rocReference'),
                showSymbol: false,
                type: 'line' as const,
              },
            ]
          : []),
      ],
    }),
    [curves, t, type],
  )

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {curves.map((curve) => (
          <Badge key={curve.class} variant="outline">
            {curve.class}{' '}
            {type === 'roc'
              ? `AUC ${(curve as NonNullable<MaelTrainingResult['rocCurve']>[number]).auc.toFixed(3)}`
              : `AP ${(curve as NonNullable<MaelTrainingResult['prCurve']>[number]).ap.toFixed(3)}`}
          </Badge>
        ))}
      </div>
      <div className="h-72 rounded-md border border-border p-2">
        <ReactECharts
          lazyUpdate
          notMerge
          option={option}
          opts={{ renderer: 'canvas' }}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
      {type === 'pr' ? (
        <p className="text-muted-foreground text-xs leading-5">
          {t('mael.prCurveHint')}
        </p>
      ) : null}
    </div>
  )
}

function ConfusionMatrixTable({ matrix }: { matrix: number[][] }) {
  const cells = [
    { key: 'tn', value: matrix[0]?.[0] ?? 0 },
    { key: 'fp', value: matrix[0]?.[1] ?? 0 },
    { key: 'fn', value: matrix[1]?.[0] ?? 0 },
    { key: 'tp', value: matrix[1]?.[1] ?? 0 },
  ]

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border text-center text-sm">
      {cells.map((cell) => (
        <div className="border-border border-b p-3 odd:border-r" key={cell.key}>
          {cell.value}
        </div>
      ))}
    </div>
  )
}

function FeatureImportancePanel({
  onViewChange,
  result,
  view,
}: {
  onViewChange: (view: 'gain' | 'shap') => void
  result: MaelTrainingResult
  view: 'gain' | 'shap'
}) {
  const { t } = useTranslation()
  const maxMeanAbs = Math.max(
    ...result.shapImportance.map((item) => item.meanAbs),
    0,
  )

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-medium text-sm">{t('mael.featureImportance')}</p>
        <div className="grid grid-cols-2 gap-1">
          {(['shap', 'gain'] as const).map((nextView) => (
            <Button
              key={nextView}
              onClick={() => onViewChange(nextView)}
              size="sm"
              type="button"
              variant={view === nextView ? 'default' : 'outline'}
            >
              {t(`mael.importanceView.${nextView}`)}
            </Button>
          ))}
        </div>
      </div>
      {view === 'shap' && result.shapImportance.length > 0 ? (
        <div className="grid gap-3">
          {result.shapImportance.map((item) => {
            const width = maxMeanAbs > 0 ? item.meanAbs / maxMeanAbs : 0
            const contributionMin = Math.min(...item.contributions, 0)
            const contributionMax = Math.max(...item.contributions, 0)
            const contributionRange = contributionMax - contributionMin || 1
            const seenDots = new Map<number, number>()
            const dots = item.contributions.slice(0, 200).map((value) => {
              const count = seenDots.get(value) ?? 0
              seenDots.set(value, count + 1)
              return {
                key: `${item.feature}-${value}-${count}`,
                value,
              }
            })

            return (
              <Tooltip key={item.feature}>
                <TooltipTrigger asChild>
                  <div className="grid gap-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="font-mono">{item.feature}</span>
                      <span>{item.meanAbs.toFixed(4)}</span>
                    </div>
                    <span className="h-2 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full bg-foreground"
                        style={{ width: `${Math.max(width * 100, 2)}%` }}
                      />
                    </span>
                    <span className="relative h-5 overflow-hidden rounded-sm bg-muted/50">
                      {dots.map((dot) => (
                        <span
                          className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-foreground/60"
                          key={dot.key}
                          style={{
                            left: `${((dot.value - contributionMin) / contributionRange) * 100}%`,
                          }}
                        />
                      ))}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  {t('mael.shapImportanceTooltip')}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-2">
          {result.featureImportance.map((item) => (
            <div className="grid gap-1 text-xs" key={item.feature}>
              <div className="flex justify-between gap-3">
                <span className="font-mono">{item.feature}</span>
                <span>{formatPercent(item.importance)}</span>
              </div>
              <span className="h-2 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full bg-foreground"
                  style={{
                    width: formatPercent(item.importance),
                  }}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProbabilityBars({
  probabilities,
}: {
  probabilities: NonNullable<MaelPredictionResult['probabilities']>
}) {
  const { t } = useTranslation()

  return (
    <div>
      <p className="mb-2 font-medium text-sm">{t('mael.classProbabilities')}</p>
      <div className="grid gap-2">
        {probabilities.map((item) => (
          <div className="grid gap-1 text-xs" key={item.label}>
            <div className="flex justify-between gap-3">
              <span>{item.label}</span>
              <span>
                {formatPercent(item.probability)}
                {item.gapToWinner > 0
                  ? ` / -${formatPercent(item.gapToWinner)}`
                  : ''}
              </span>
            </div>
            <span className="h-2 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full bg-foreground"
                style={{
                  width: formatPercent(item.probability),
                }}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContributionChart({
  onClassChange,
  prediction,
  resolvedTask,
  selectedClass,
}: {
  onClassChange: (value: string) => void
  prediction: MaelPredictionResult
  resolvedTask: MaelTrainingResult['resolvedTask']
  selectedClass: string
}) {
  const { t } = useTranslation()
  const classRows = prediction.classContribs ?? []
  const activeClass =
    classRows.find((row) => row.class === selectedClass) ?? classRows[0]
  const contribs = (activeClass?.contribs ?? prediction.contribs)
    .toSorted(
      (left, right) =>
        Math.abs(right.contribution) - Math.abs(left.contribution),
    )
    .slice(0, 12)
  const bias = activeClass?.bias ?? prediction.bias
  const isClassification = resolvedTask !== 'regression'

  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      grid: { bottom: 24, left: 92, right: 24, top: 18 },
      tooltip: {
        formatter: (params: unknown) => {
          const p = params as { data: number; name: string }
          const sign = p.data >= 0 ? '+' : ''
          return `${p.name}: ${sign}${p.data.toFixed(4)}`
        },
        trigger: 'item',
      },
      xAxis: {
        axisLabel: { color: 'var(--fg-3)' },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        splitLine: { lineStyle: { color: 'var(--border)' } },
        type: 'value',
      },
      yAxis: {
        axisLabel: { color: 'var(--fg-3)' },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        data: contribs.map((item) => item.feature).reverse(),
        type: 'category',
      },
      series: [
        {
          data: contribs.map((item) => item.contribution).reverse(),
          itemStyle: {
            color: (params: unknown) => {
              const p = params as { value: number }
              return p.value >= 0 ? '#16a34a' : '#dc2626'
            },
          },
          markLine: {
            data: [{ xAxis: 0 }, { xAxis: bias }],
            lineStyle: { color: 'var(--fg-3)', opacity: 0.45, type: 'dashed' },
            symbol: 'none',
          },
          type: 'bar',
        },
      ],
    }),
    [bias, contribs],
  )

  if (contribs.length === 0) {
    return null
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-medium text-sm">{t('mael.localContribs')}</p>
        {classRows.length > 1 ? (
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none"
            onChange={(event) => onClassChange(event.target.value)}
            value={activeClass?.class ?? ''}
          >
            {classRows.map((row) => (
              <option key={row.class} value={row.class}>
                {row.class}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="h-72 rounded-md border border-border p-2">
        <ReactECharts
          lazyUpdate
          notMerge
          option={option}
          opts={{ renderer: 'canvas' }}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
      <p className="mt-2 text-muted-foreground text-xs leading-5">
        {isClassification
          ? t('mael.localContribsClassification', {
              label: activeClass?.class ?? prediction.prediction,
            })
          : t('mael.localContribsRegression')}
      </p>
    </div>
  )
}

function BatchExplanationDialog({
  explanation,
  onOpenChange,
  resolvedTask,
}: {
  explanation: {
    result: MaelContributionResult
    row: Record<string, string | number | null>
  } | null
  onOpenChange: (open: boolean) => void
  resolvedTask: MaelTrainingResult['resolvedTask']
}) {
  const { t } = useTranslation()
  const [selectedClass, setSelectedClass] = useState('')

  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(explanation)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('mael.explainRow')}</DialogTitle>
        </DialogHeader>
        {explanation ? (
          <div className="grid gap-4">
            <div className="max-h-28 overflow-auto rounded-md bg-muted p-3">
              <div className="grid gap-1 text-xs">
                {Object.entries(explanation.row)
                  .slice(0, 24)
                  .map(([key, value]) => (
                    <div className="flex justify-between gap-3" key={key}>
                      <span className="font-mono text-muted-foreground">
                        {key}
                      </span>
                      <span className="truncate">{formatCell(value)}</span>
                    </div>
                  ))}
              </div>
            </div>
            <ContributionChart
              onClassChange={setSelectedClass}
              prediction={{
                ...explanation.result,
                prediction: '',
              }}
              resolvedTask={resolvedTask}
              selectedClass={selectedClass}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function BatchPredictionPanel({
  batchFileInputRef,
  batchFileName,
  batchResult,
  isBatchPredicting,
  isExplainingRow,
  onDownload,
  onExplainRow,
  onSelectFile,
  resolvedTask,
}: {
  batchFileInputRef: RefObject<HTMLInputElement | null>
  batchFileName: string
  batchResult: MaelBatchPredictionResult | null
  isBatchPredicting: boolean
  isExplainingRow: boolean
  onDownload: (result: MaelBatchPredictionResult) => void
  onExplainRow: (
    row: Record<string, string | number | null>,
    rowKey: string,
  ) => void
  onSelectFile: (file: File | undefined) => void
  resolvedTask: MaelTrainingResult['resolvedTask']
}) {
  const { t } = useTranslation()
  const isClassification = resolvedTask !== 'regression'

  const distributionOption = useMemo<EChartsOption | null>(() => {
    if (!batchResult?.distribution?.length || !isClassification) {
      return null
    }

    return {
      backgroundColor: 'transparent',
      color: ['#fafafa', '#a1a1aa', '#71717a', '#52525b', '#d4d4d8'],
      legend: {
        bottom: 0,
        textStyle: { color: 'var(--fg-2)', fontSize: 11 },
      },
      series: [
        {
          avoidLabelOverlap: true,
          data: batchResult.distribution.map((item) => ({
            name: item.label,
            value: item.count,
          })),
          itemStyle: {
            borderColor: 'var(--bg)',
            borderRadius: 4,
            borderWidth: 2,
          },
          label: {
            color: 'var(--fg)',
            formatter: '{b}: {c}',
          },
          radius: ['48%', '70%'],
          type: 'pie',
        },
      ],
      tooltip: { trigger: 'item' },
    } satisfies EChartsOption
  }, [batchResult, isClassification])

  return (
    <div className="grid gap-4">
      <div>
        <div className="mb-3 flex items-center gap-2 font-medium text-sm">
          <FileUp aria-hidden="true" size={16} />
          {t('mael.batchPrediction')}
        </div>
        <input
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            onSelectFile(event.target.files?.[0])
            event.target.value = ''
          }}
          ref={batchFileInputRef}
          type="file"
        />
        <Button
          className="w-full"
          disabled={isBatchPredicting}
          onClick={() => batchFileInputRef.current?.click()}
          variant="outline"
        >
          {isBatchPredicting ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={17} />
          ) : (
            <Upload aria-hidden="true" size={17} />
          )}
          {t('mael.uploadBatchCsv')}
        </Button>
        <p className="mt-2 text-muted-foreground text-xs leading-5">
          {t('mael.batchHint')}
        </p>
      </div>

      {batchFileName ? (
        <div className="rounded-md bg-muted p-3">
          <p className="text-muted-foreground text-xs">{t('mael.batchFile')}</p>
          <p className="truncate font-medium text-sm">{batchFileName}</p>
        </div>
      ) : null}

      {batchResult ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <MetricTile
              label={t('mael.metrics.rows')}
              value={batchResult.rowCount}
            />
            <MetricTile
              label={t('mael.metrics.outputColumns')}
              value={batchResult.columns.length}
            />
          </div>

          {distributionOption ? (
            <div>
              <p className="mb-2 font-medium text-sm">
                {t('mael.predictionSplit')}
              </p>
              <div className="h-64 rounded-md border border-border p-2">
                <ReactECharts
                  lazyUpdate
                  notMerge
                  option={distributionOption}
                  opts={{ renderer: 'canvas' }}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm">
              {t('mael.batchDistributionHint')}
            </p>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{t('mael.batchOutput')}</p>
              <Button
                onClick={() => onDownload(batchResult)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Download aria-hidden="true" size={15} />
                {t('mael.csv')}
              </Button>
            </div>
            <div className="max-h-80 overflow-auto rounded-md border border-border">
              <table className="w-full min-w-max border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">
                      {t('mael.explain')}
                    </th>
                    {batchResult.columns.map((column) => (
                      <th className="px-3 py-2 font-medium" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batchResult.rows.slice(0, 80).map((row) => {
                    const rowKey = batchResult.columns
                      .map((column) => formatCell(row[column] ?? null))
                      .join('|')

                    return (
                      <tr className="border-border border-t" key={rowKey}>
                        <td className="px-3 py-2">
                          <Button
                            aria-label={t('mael.explainRow')}
                            disabled={isExplainingRow}
                            onClick={() => onExplainRow(row, rowKey)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {isExplainingRow ? (
                              <Loader2
                                aria-hidden="true"
                                className="animate-spin"
                                size={13}
                              />
                            ) : (
                              <Info aria-hidden="true" size={13} />
                            )}
                          </Button>
                        </td>
                        {batchResult.columns.map((column) => (
                          <td className="px-3 py-2" key={column}>
                            {formatCell(row[column] ?? null)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {batchResult.rows.length > 80 ? (
              <p className="mt-2 text-muted-foreground text-xs">
                {t('mael.truncatedHint')}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}

function MetricTile({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

function MetricGroup({
  metrics,
  title,
}: {
  metrics: NonNullable<MaelTrainingResult['metrics']['val']>
  title: string
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 font-medium text-sm">{title}</p>
      <div className="grid gap-2">
        {metrics.map((metric) => (
          <div
            className="flex items-center justify-between gap-3 text-sm"
            key={metric.label}
          >
            <span className="text-muted-foreground">{metric.label}</span>
            <span className="font-medium">{formatMetric(metric)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WhatIfField({
  field,
  onChange,
  value,
}: {
  field: MaelFeatureField
  onChange: (name: string, value: string) => void
  value: string | number
}) {
  const fieldId = `mael-field-${field.name.replaceAll(/\W+/g, '-')}`

  return (
    <label
      className="grid gap-1 font-medium text-muted-foreground text-xs"
      htmlFor={fieldId}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{field.name}</span>
        <Badge variant="outline">{field.kind}</Badge>
      </span>
      {field.kind === 'categorical' ? (
        <select
          className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none"
          id={fieldId}
          onChange={(event) => onChange(field.name, event.target.value)}
          value={String(value)}
        >
          {field.categories?.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none"
          id={fieldId}
          max={field.max}
          min={field.min}
          onChange={(event) => onChange(field.name, event.target.value)}
          type="number"
          value={value}
        />
      )}
    </label>
  )
}
