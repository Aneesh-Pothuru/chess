// Opponent strength presets. Stockfish's own floor (Skill 0 / UCI_Elo 1320)
// is far above a ~700 player, so the weak presets combine minimum skill,
// crippled search, and app-side blunder injection (see opponent.ts).

export interface OpponentPreset {
  id: string
  name: string
  eloLabel: string // estimate, not calibrated
  skill: number // Skill Level 0-20
  depth: number
  movetimeMs: number
  blunderChance: number // probability of playing an injected non-engine move
  description: string
}

export const OPPONENT_PRESETS: OpponentPreset[] = [
  {
    id: 'rookie',
    name: 'Rookie',
    eloLabel: '~550',
    skill: 0,
    depth: 1,
    movetimeMs: 30,
    blunderChance: 0.28,
    description: 'Hangs pieces often. Warm-up and conversion practice.',
  },
  {
    id: 'sparring',
    name: 'Sparring partner',
    eloLabel: '~750',
    skill: 0,
    depth: 2,
    movetimeMs: 60,
    blunderChance: 0.16,
    description: 'Around your current level. The default training game.',
  },
  {
    id: 'challenger',
    name: 'Challenger',
    eloLabel: '~950',
    skill: 2,
    depth: 3,
    movetimeMs: 90,
    blunderChance: 0.07,
    description: 'Where you are headed. Punishes loose pieces.',
  },
  {
    id: 'tough',
    name: 'Tough',
    eloLabel: '~1150',
    skill: 5,
    depth: 5,
    movetimeMs: 150,
    blunderChance: 0.02,
    description: 'Stretch games. Expect to defend.',
  },
  {
    id: 'full',
    name: 'Full strength',
    eloLabel: 'max',
    skill: 20,
    depth: 22,
    movetimeMs: 400,
    blunderChance: 0,
    description: 'Drill defense. Used by endgame and conversion trainers.',
  },
]

export function presetById(id: string): OpponentPreset {
  return OPPONENT_PRESETS.find((p) => p.id === id) ?? OPPONENT_PRESETS[1]
}

/** Analyst settings: full skill, capped effort, tuned for responsiveness. */
export const ANALYST = {
  /** Post-move blunder check depth. */
  checkDepth: 10,
  /** Game-import scan depth (many positions → keep it cheap). */
  scanDepth: 8,
  /** Eval-bar refresh depth. */
  barDepth: 8,
}
