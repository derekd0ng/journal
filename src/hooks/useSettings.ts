import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import type { Settings } from '@/db/schema'

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get(1))
}
