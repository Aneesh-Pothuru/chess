// Two shared engine instances: the opponent (strength-limited per preset) and
// the analyst (always full skill). Lazily initialized singletons.

import { UciEngine } from './uci'

let opponent: UciEngine | null = null
let analyst: UciEngine | null = null
let opponentInit: Promise<UciEngine> | null = null
let analystInit: Promise<UciEngine> | null = null

export function getOpponent(): Promise<UciEngine> {
  if (!opponentInit) {
    const eng = new UciEngine()
    opponent = eng
    opponentInit = eng.init().then(() => eng)
    // A failed init must not be cached forever — clear so the next call retries.
    opponentInit.catch(() => {
      if (opponent === eng) {
        eng.destroy()
        opponent = null
        opponentInit = null
      }
    })
  }
  return opponentInit
}

export function getAnalyst(): Promise<UciEngine> {
  if (!analystInit) {
    const eng = new UciEngine()
    analyst = eng
    analystInit = eng.init().then(async () => {
      await eng.setOption('Skill Level', 20)
      return eng
    })
    analystInit.catch(() => {
      if (analyst === eng) {
        eng.destroy()
        analyst = null
        analystInit = null
      }
    })
  }
  return analystInit
}
