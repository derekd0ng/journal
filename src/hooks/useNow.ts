import { useState, useEffect } from 'react'
import { now } from 'lib/time'

/** Возвращает текущее время, обновляется каждые intervalMs мс */
export function useNow(intervalMs = 60_000): Date {
  const [date, setDate] = useState(now)
  useEffect(() => {
    const id = setInterval(() => setDate(now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return date
}
