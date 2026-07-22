import { london } from './london'
import { caroKann } from './caroKann'
import { kingsIndian } from './kingsIndian'
import type { Repertoire } from './types'

export const REPERTOIRES: Repertoire[] = [london, caroKann, kingsIndian]

export function repertoireById(id: string): Repertoire | undefined {
  return REPERTOIRES.find((r) => r.id === id)
}

/** Which Black repertoire answers this first White move? */
export function blackRepertoireFor(firstWhiteMoveSan: string): Repertoire {
  return firstWhiteMoveSan === 'e4' ? caroKann : kingsIndian
}

export { london, caroKann, kingsIndian }
