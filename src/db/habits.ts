import { db } from './schema'
import type { Habit, HabitCheck, HabitCheckStatus } from './schema'

export type NewHabit = Omit<Habit, 'id' | 'created_at' | 'updated_at'>

export async function getActiveHabits(): Promise<Habit[]> {
  return db.habits.filter(h => h.archived_at == null).toArray()
}

export async function addHabit(habit: NewHabit): Promise<string> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.habits.add({ ...habit, id, created_at: now, updated_at: now })
  return id
}

export async function archiveHabit(id: string): Promise<void> {
  await db.habits.update(id, {
    archived_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

export async function getHabitChecksForRange(fromDate: string, toDate: string): Promise<HabitCheck[]> {
  return db.habit_checks
    .where('date')
    .between(fromDate, toDate, true, true)
    .toArray()
}

export async function setHabitCheck(
  habitId: string,
  date: string,
  status: HabitCheckStatus
): Promise<void> {
  const existing = await db.habit_checks
    .where('[habit_id+date]')
    .equals([habitId, date])
    .first()

  const now = new Date().toISOString()
  if (existing) {
    await db.habit_checks.update(existing.id, { status })
  } else {
    await db.habit_checks.add({
      id: crypto.randomUUID(),
      habit_id: habitId,
      date,
      status,
      created_at: now,
    })
  }
}

export async function deleteHabitCheck(habitId: string, date: string): Promise<void> {
  const existing = await db.habit_checks
    .where('[habit_id+date]')
    .equals([habitId, date])
    .first()
  if (existing) await db.habit_checks.delete(existing.id)
}
