export interface SqlRushWord {
  id: string
  word: string
  type: string
  difficulty: number
  unlockScore: number
  active: boolean
}

export interface SqlRushProgress {
  highScore: number
  lastScore: number
  sessionsPlayed: number
}

export interface SqlRushScorePayload {
  score: number
  maxDifficulty: number
  wordsCleared: number
  durationMs: number
}
