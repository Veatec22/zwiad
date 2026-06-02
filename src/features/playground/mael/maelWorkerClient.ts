import type {
  MaelBatchPredictionResult,
  MaelContributionResult,
  MaelDatasetProfile,
  MaelDateExtractionResult,
  MaelDateFeature,
  MaelExportRunResult,
  MaelPredictionResult,
  MaelReviewFlag,
  MaelTrainingResult,
  MaelTrainRequest,
} from './maelTypes'

type MaelWorkerMessageType =
  | 'predict_batch'
  | 'predict_contribs_row'
  | 'profile'
  | 'predict'
  | 'review'
  | 'train'
  | 'export_run'
  | 'extract_date_features'
type MaelRunMessageType = 'set_active_run' | 'set_run_pinned'

interface MaelWorkerResponse {
  error?: string
  id: number
  ok: boolean
  payload?: unknown
}

interface PendingRequest<T> {
  reject: (reason?: unknown) => void
  resolve: (value: T) => void
}

export class MaelWorkerClient {
  private nextId = 1
  private readonly pending = new Map<number, PendingRequest<unknown>>()
  private readonly worker: Worker

  constructor() {
    this.worker = new Worker('/playground/mael/mael_worker.js')
    this.worker.addEventListener('message', this.handleMessage)
    this.worker.addEventListener('error', this.handleError)
  }

  dispose() {
    this.worker.removeEventListener('message', this.handleMessage)
    this.worker.removeEventListener('error', this.handleError)
    this.worker.terminate()
    this.pending.clear()
  }

  profile(csvText: string) {
    return this.request<MaelDatasetProfile>('profile', { csvText })
  }

  review(payload: {
    csvText: string
    excludedFeatures: string[]
    target: string
  }) {
    return this.request<MaelReviewFlag[]>('review', payload)
  }

  extractDateFeatures(payload: {
    column: string
    csvText: string
    options: {
      features: MaelDateFeature[]
      keepOriginal: boolean
    }
  }) {
    return this.request<MaelDateExtractionResult>(
      'extract_date_features',
      payload,
    )
  }

  train(payload: MaelTrainRequest) {
    return this.request<MaelTrainingResult>('train', payload)
  }

  predict(values: Record<string, string | number>, runId?: string) {
    return this.request<MaelPredictionResult>('predict', { runId, values })
  }

  predictBatch(csvText: string, runId?: string) {
    return this.request<MaelBatchPredictionResult>('predict_batch', {
      csvText,
      runId,
    })
  }

  predictContribsRow(values: Record<string, string | number>, runId?: string) {
    return this.request<MaelContributionResult>('predict_contribs_row', {
      runId,
      values,
    })
  }

  exportRun(runId: string) {
    return this.request<MaelExportRunResult>('export_run', { runId })
  }

  setActiveRun(runId: string) {
    return this.request<MaelTrainingResult>('set_active_run', { runId })
  }

  setRunPinned(runId: string, pinned: boolean) {
    return this.request<MaelTrainingResult>('set_run_pinned', { pinned, runId })
  }

  private readonly handleMessage = (
    event: MessageEvent<MaelWorkerResponse>,
  ) => {
    const { error, id, ok, payload } = event.data
    const pending = this.pending.get(id)

    if (!pending) {
      return
    }

    this.pending.delete(id)

    if (ok) {
      pending.resolve(payload)
      return
    }

    pending.reject(new Error(error ?? 'Pyodide worker failed'))
  }

  private readonly handleError = (event: ErrorEvent) => {
    for (const pending of this.pending.values()) {
      pending.reject(new Error(event.message))
    }

    this.pending.clear()
  }

  private request<T>(
    type: MaelRunMessageType | MaelWorkerMessageType,
    payload: unknown,
  ) {
    const id = this.nextId
    this.nextId += 1

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        reject,
        resolve: resolve as PendingRequest<unknown>['resolve'],
      })
      this.worker.postMessage({ id, payload, type })
    })
  }
}
