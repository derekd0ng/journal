import { startOfDay, addHours, addDays, isBefore, parseISO, format } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export interface TimeSettings {
  timezone: string
  day_start_hour: number
}

/** Единственное место, где создаётся "текущий момент" */
export function now(): Date {
  return new Date()
}

export function toUTCString(date: Date): string {
  return date.toISOString()
}

export function parseUTC(str: string): Date {
  return parseISO(str)
}

/**
 * Возвращает начало и конец «логического дня» для заданного момента времени.
 * Учитывает day_start_hour и часовой пояс пользователя.
 *
 * Пример: day_start_hour=4, timezone=Europe/Moscow
 *   03:59 Moscow → принадлежит предыдущему дню (день начинается в 04:00)
 *   04:00 Moscow → принадлежит текущему дню
 */
export function getDayBounds(
  date: Date,
  settings: TimeSettings
): { start: Date; end: Date } {
  const { timezone, day_start_hour } = settings

  const zonedDate = toZonedTime(date, timezone)
  const localMidnight = startOfDay(zonedDate)
  const dayStartCandidate = addHours(localMidnight, day_start_hour)

  const effectiveDayStart = isBefore(zonedDate, dayStartCandidate)
    ? addHours(addDays(localMidnight, -1), day_start_hour)
    : dayStartCandidate

  const effectiveDayEnd = addDays(effectiveDayStart, 1)

  return {
    start: fromZonedTime(effectiveDayStart, timezone),
    end: fromZonedTime(effectiveDayEnd, timezone),
  }
}

/** Форматирует Date как YYYY-MM-DD в часовом поясе пользователя */
export function toDayDateString(date: Date, timezone: string): string {
  return format(toZonedTime(date, timezone), 'yyyy-MM-dd')
}

/** Форматирует Date как HH:mm в часовом поясе пользователя */
export function toTimeString(date: Date, timezone: string): string {
  return format(toZonedTime(date, timezone), 'HH:mm')
}

/** Длительность интервала в минутах */
export function durationMinutes(startedAt: string, endedAt: string): number {
  return (parseISO(endedAt).getTime() - parseISO(startedAt).getTime()) / 60_000
}

/**
 * Обрезает интервал [start, end] по границам периода [periodStart, periodEnd].
 * Возвращает null, если интервал полностью за пределами периода.
 */
export function clipInterval(
  startedAt: string,
  endedAt: string,
  periodStart: Date,
  periodEnd: Date
): { clippedStart: Date; clippedEnd: Date } | null {
  const s = parseISO(startedAt)
  const e = parseISO(endedAt)
  if (e <= periodStart || s >= periodEnd) return null
  return {
    clippedStart: s < periodStart ? periodStart : s,
    clippedEnd: e > periodEnd ? periodEnd : e,
  }
}
