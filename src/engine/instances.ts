// Two shared engine instances: the opponent (strength-limited per preset) and
// the analyst (always full skill). Lazily initialized singletons.

import { UciEngine } from './uci'

let opponent: UciEngine | null = null
let analyst: UciEngine | null = null
let opponentInit: Promise<UciEngine> | null = null
let analystInit: Promise<UciEngine> | null = null

export function getOpponent(): Promise<UciEngine> {
  if (!opponentInit) {
    opponent = new UciEngine()
    opponentInit = opponent.init().then(() => opponent!)
  }
  return opponentInit
}

export function getAnalyst(): Promise<UciEngine> {
  if (!analystInit) {
    analyst = new UciEngine()
    analystInit = analyst
      .init()
      .then(async () => {
        await analyst!.setOption('Skill Level', 20)
        return analyst!
      })
  }
  return analystInit
}
