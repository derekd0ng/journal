import { useLiveQuery } from 'dexie-react-hooks'
import { getEntriesForRange } from '@/db/entries'
import type { TimeEntry } from '@/db/schema'

/** Живая подписка на записи за диапазон. Обновляется при любом изменении IndexedDB. */
export function useTimeEntries(fromISO: string, toISO: string): TimeEntry[] | undefined {
  return useLiveQuery(
    () => (fromISO && toISO ? getEntriesForRange(fromISO, toISO) : Promise.resolve([])),
    [fromISO, toISO],
  )
}
