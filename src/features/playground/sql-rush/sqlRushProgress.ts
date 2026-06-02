import type { SqlRushProgress } from './sqlRushTypes'

const storageKey = 'sql-rush:progress:v1'

const defaultProgress: SqlRushProgress = {
  highScore: 0,
  lastScore: 0,
  sessionsPlayed: 0,
}

export function getSqlRushProgress(): SqlRushProgress {
  const rawProgress = localStorage.getItem(storageKey)

  if (!rawProgress) {
    return defaultProgress
  }

  try {
    return {
      ...defaultProgress,
      ...JSON.parse(rawProgress),
    }
  } catch {
    return defaultProgress
  }
}

export function saveSqlRushProgress(progress: SqlRushProgress) {
  localStorage.setItem(storageKey, JSON.stringify(progress))
}

export function recordSqlRushScore(score: number) {
  const progress = getSqlRushProgress()
  const nextProgress = {
    ...progress,
    highScore: Math.max(progress.highScore, score),
    lastScore: score,
    sessionsPlayed: progress.sessionsPlayed + 1,
  }

  saveSqlRushProgress(nextProgress)

  return nextProgress
}
