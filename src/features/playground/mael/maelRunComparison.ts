import type { MaelRun } from './maelTypes'

export interface MaelRunDelta {
  comparable: boolean
  direction: 'improvement' | 'neutral' | 'regression'
  reason?: 'different-random-state' | 'different-validation' | 'missing-metric'
  text: string
}

const lowerIsBetterMetrics = new Set(['Log loss', 'RMSE'])

export function compareRunToActive(
  run: MaelRun,
  activeRun: MaelRun,
): MaelRunDelta {
  if (
    run.validation !== activeRun.validation ||
    (run.validation === 'cv' && run.cvFolds !== activeRun.cvFolds) ||
    run.ordering !== activeRun.ordering
  ) {
    return {
      comparable: false,
      direction: 'neutral',
      reason: 'different-validation',
      text: '—',
    }
  }

  if (!run.primaryMetric || !activeRun.primaryMetric) {
    return {
      comparable: false,
      direction: 'neutral',
      reason: 'missing-metric',
      text: '—',
    }
  }

  if (run.primaryMetric.label !== activeRun.primaryMetric.label) {
    return {
      comparable: false,
      direction: 'neutral',
      reason: 'missing-metric',
      text: '—',
    }
  }

  const runValue = Number(run.primaryMetric.value)
  const activeValue = Number(activeRun.primaryMetric.value)
  const rawDelta = runValue - activeValue
  const effectiveDelta = lowerIsBetterMetrics.has(run.primaryMetric.label)
    ? -rawDelta
    : rawDelta
  const direction =
    effectiveDelta > 0
      ? 'improvement'
      : effectiveDelta < 0
        ? 'regression'
        : 'neutral'

  return {
    comparable: true,
    direction,
    reason:
      run.randomState !== activeRun.randomState
        ? 'different-random-state'
        : undefined,
    text: `${rawDelta >= 0 ? '+' : ''}${rawDelta.toFixed(4)}`,
  }
}
