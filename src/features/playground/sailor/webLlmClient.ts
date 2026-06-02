import WebLlmWorker from './webLlmWorker?worker'

import type {
  AppConfig,
  InitProgressCallback,
  InitProgressReport,
  MLCEngineInterface,
  ModelRecord,
} from '@mlc-ai/web-llm'

import type {
  SailorAiResponse,
  SailorProfile,
  SailorModel,
  SuggestedDerivedFeature,
  SuggestedExplorerQuery,
} from './sailorTypes'

const DEFAULT_WEBLLM_MODEL_ID = 'SmolLM2-360M-Instruct-q4f16_1-MLC'
const LLM_MODEL_TYPE = 0
const engineLoadStallTimeoutMs = 60_000
const engineLoadTotalTimeoutMs = 5 * 60_000

interface WebLlmAskRequest {
  question: string
  profile: SailorProfile
  lastQuery: string
  modelId: string
}

export interface WebLlmProgress {
  progress: number
  text: string
}

let engine: MLCEngineInterface | null = null
let worker: Worker | null = null
let loadedModelId: string | null = null
let loadingPromise: Promise<MLCEngineInterface> | null = null

export function getDefaultWebLlmModelId() {
  return DEFAULT_WEBLLM_MODEL_ID
}

export async function listWebLlmModels(): Promise<SailorModel[]> {
  const webllm = await import('@mlc-ai/web-llm')

  return webllm.prebuiltAppConfig.model_list.filter(isTextModel).map(toModel)
}

export async function askWebLlm(
  request: WebLlmAskRequest,
  onProgress?: (progress: WebLlmProgress) => void,
): Promise<SailorAiResponse> {
  const nextEngine = await ensureEngine(request.modelId, onProgress)
  const completion = await nextEngine.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: [
          'You are a data analyst inside a browser SQL explorer.',
          'Return strict JSON only with keys: answer, suggestedQueries, derivedFeatures.',
          'suggestedQueries is an array of {title, sql, reason}.',
          'derivedFeatures is an array of {name, sqlExpression, why}.',
          `Use DuckDB SQL and table name ${request.profile.tableName}.`,
          'Do not invent columns. Do not add markdown.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify({
          question: request.question,
          profile: request.profile,
          lastQuery: request.lastQuery,
        }),
      },
    ],
    temperature: 0.2,
    top_p: 0.85,
    max_tokens: 900,
  })
  const content = completion.choices[0]?.message.content?.trim()

  if (!content) {
    throw new Error('WebLLM returned empty response')
  }

  return parseAiResponse(content)
}

async function ensureEngine(
  modelId: string,
  onProgress?: (progress: WebLlmProgress) => void,
): Promise<MLCEngineInterface> {
  if (!navigator.gpu) {
    throw new Error('WebGPU is unavailable in this browser.')
  }

  if (engine && loadedModelId === modelId) return engine
  if (loadingPromise && loadedModelId === modelId) return loadingPromise

  await unloadEngine()
  loadedModelId = modelId
  loadingPromise = createEngine(modelId, onProgress)

  try {
    engine = await loadingPromise
    return engine
  } catch (error) {
    loadedModelId = null
    throw error
  } finally {
    loadingPromise = null
  }
}

async function createEngine(
  modelId: string,
  onProgress?: (progress: WebLlmProgress) => void,
) {
  const webllm = await import('@mlc-ai/web-llm')
  const appConfig = getAppConfig(webllm.prebuiltAppConfig)

  assertIntegratedModel(appConfig.model_list, modelId)

  try {
    return await createWebWorkerEngineWithWatchdog({
      createEngine: (initProgressCallback) =>
        webllm.CreateWebWorkerMLCEngine(createWorker(), modelId, {
          appConfig,
          initProgressCallback,
          logLevel: 'INFO',
        }),
      onProgress,
    })
  } catch (firstError) {
    disposeWorker()
    onProgress?.({
      progress: 0,
      text: 'WebLLM cache stalled. Clearing cached model and retrying...',
    })
    await webllm.deleteModelAllInfoInCache(modelId, appConfig)

    try {
      return await createWebWorkerEngineWithWatchdog({
        createEngine: (initProgressCallback) =>
          webllm.CreateWebWorkerMLCEngine(createWorker(), modelId, {
            appConfig,
            initProgressCallback,
            logLevel: 'INFO',
          }),
        onProgress,
      })
    } catch (secondError) {
      disposeWorker()
      throw new Error(
        `WebLLM failed to load ${modelId} after clearing cache. ${getErrorMessage(
          secondError,
        )} First attempt: ${getErrorMessage(firstError)}`,
        { cause: secondError },
      )
    }
  }
}

async function createWebWorkerEngineWithWatchdog({
  createEngine,
  onProgress,
}: {
  createEngine: (
    initProgressCallback: InitProgressCallback,
  ) => Promise<MLCEngineInterface>
  onProgress?: (progress: WebLlmProgress) => void
}) {
  let lastProgress = 0
  let lastCallbackAt = Date.now()
  const startedAt = Date.now()

  return new Promise<MLCEngineInterface>((resolve, reject) => {
    let settled = false
    const timeout = window.setInterval(() => {
      if (settled) return

      const now = Date.now()
      if (now - startedAt > engineLoadTotalTimeoutMs) {
        settled = true
        window.clearInterval(timeout)
        reject(
          new Error(
            `WebLLM model loading timed out at ${formatProgress(lastProgress)}.`,
          ),
        )
        return
      }

      if (now - lastCallbackAt > engineLoadStallTimeoutMs) {
        settled = true
        window.clearInterval(timeout)
        reject(
          new Error(
            `WebLLM model loading stalled at ${formatProgress(
              lastProgress,
            )} after 60 seconds without progress.`,
          ),
        )
      }
    }, 1_000)

    const initProgressCallback = (report: InitProgressReport) => {
      lastCallbackAt = Date.now()
      lastProgress = Math.max(lastProgress, report.progress)
      onProgress?.({
        progress: report.progress,
        text: report.text,
      })
    }

    createEngine(initProgressCallback).then(
      (nextEngine) => {
        if (settled) return
        settled = true
        window.clearInterval(timeout)
        resolve(nextEngine)
      },
      (error: unknown) => {
        if (settled) return
        settled = true
        window.clearInterval(timeout)
        reject(error)
      },
    )
  })
}

async function unloadEngine() {
  await engine?.unload()
  engine = null
  loadedModelId = null
  loadingPromise = null
  disposeWorker()
}

function createWorker() {
  disposeWorker()
  worker = new WebLlmWorker()
  return worker
}

function disposeWorker() {
  worker?.terminate()
  worker = null
}

function getAppConfig(appConfig: AppConfig): AppConfig {
  return {
    ...appConfig,
    cacheBackend: 'indexeddb',
  }
}

function parseAiResponse(rawText: string): SailorAiResponse {
  let parsed: unknown

  try {
    parsed = JSON.parse(stripJsonFences(rawText))
  } catch {
    throw new Error('WebLLM did not return valid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('WebLLM did not return a JSON object')
  }

  const value = parsed as Record<string, unknown>

  return {
    answer: typeof value.answer === 'string' ? value.answer : '',
    suggestedQueries: Array.isArray(value.suggestedQueries)
      ? value.suggestedQueries.filter(isSuggestedQuery)
      : [],
    derivedFeatures: Array.isArray(value.derivedFeatures)
      ? value.derivedFeatures.filter(isDerivedFeature)
      : [],
  }
}

function stripJsonFences(text: string) {
  let cleaned = text.trim()

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }

  return cleaned.trim()
}

function isSuggestedQuery(value: unknown): value is SuggestedExplorerQuery {
  return (
    !!value &&
    typeof value === 'object' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'sql' in value &&
    typeof value.sql === 'string' &&
    'reason' in value &&
    typeof value.reason === 'string'
  )
}

function isDerivedFeature(value: unknown): value is SuggestedDerivedFeature {
  return (
    !!value &&
    typeof value === 'object' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'sqlExpression' in value &&
    typeof value.sqlExpression === 'string' &&
    'why' in value &&
    typeof value.why === 'string'
  )
}

function assertIntegratedModel(models: ModelRecord[], modelId: string) {
  const found = models.some(
    (record) => record.model_id === modelId && isTextModel(record),
  )

  if (!found) {
    throw new Error(`WebLLM model is not integrated: ${modelId}`)
  }
}

function isTextModel(record: ModelRecord) {
  return record.model_type === undefined || record.model_type === LLM_MODEL_TYPE
}

function toModel(record: ModelRecord): SailorModel {
  return {
    id: record.model_id,
    owner: 'WebLLM',
    label: record.model_id,
    name: record.model_id,
    contextLength: null,
    promptPrice: '0',
    completionPrice: '0',
  }
}

function formatProgress(progress: number) {
  return `${Math.round(progress * 100)}%`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
