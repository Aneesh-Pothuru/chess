import { useSyncExternalStore } from 'react'
import { getProfile, subscribe, type Profile } from '../store/profile'

export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, getProfile)
}
