import { useMemo } from 'react'
import { getDayBounds } from 'lib/time'
import { useSettings } from './useSettings'

export function useDayBounds(date: Date): { start: Date; end: Date } | null {
  const settings = useSettings()
  // date.toDateString() как ключ — пересчитываем только при смене дня
  const dateKey = date.toDateString()
  return useMemo(() => {
    if (!settings) return null
    return getDayBounds(date, settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.timezone, settings?.day_start_hour, dateKey])
}
