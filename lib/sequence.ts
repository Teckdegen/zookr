// Server-side sequence engine — controls win/loss outcomes
// NEVER expose this logic to the client

export type GameResult = 'win' | 'loss'

// First 5 games are always losses
const FORCED_LOSSES = 5

// Win count per 10-game block based on deposit tier
function winsPerBlock(depositUsd: number): number {
  if (depositUsd >= 5) return 3   // 30% win rate
  if (depositUsd >= 4) return 2   // 20% win rate (closer to 27% but capped logic)
  if (depositUsd >= 3) return 2   // 20%
  if (depositUsd >= 2) return 2   // 20%
  return 2                         // $1 — 20% baseline
}

// Generate a 10-game block with N wins, shuffled
// Rules: no back-to-back wins, no win on index 0 (right after forced losses)
function generateBlock(winCount: number): GameResult[] {
  const block: GameResult[] = Array(10).fill('loss')
  let placed = 0
  const attempts = 1000

  for (let i = 0; i < attempts && placed < winCount; i++) {
    const pos = Math.floor(Math.random() * 10)
    if (block[pos] === 'win') continue
    if (pos === 0) continue // never win immediately after forced losses end
    if (pos > 0 && block[pos - 1] === 'win') continue // no back-to-back
    if (pos < 9 && block[pos + 1] === 'win') continue // no back-to-back
    block[pos] = 'win'
    placed++
  }

  return block
}

export function generateFullSequence(depositUsd: number, totalGames: number = 100): GameResult[] {
  const sequence: GameResult[] = []

  // First 5 always loss
  for (let i = 0; i < FORCED_LOSSES; i++) {
    sequence.push('loss')
  }

  // Generate blocks of 10
  const blocksNeeded = Math.ceil((totalGames - FORCED_LOSSES) / 10)
  const wins = winsPerBlock(depositUsd)

  for (let b = 0; b < blocksNeeded; b++) {
    const block = generateBlock(wins)
    sequence.push(...block)
  }

  return sequence.slice(0, totalGames)
}

export function getNextResult(sequence: GameResult[], index: number): GameResult {
  if (index >= sequence.length) return 'loss'
  return sequence[index]
}
