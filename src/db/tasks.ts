import { db } from './schema'
import type { Task, TaskStatus } from './schema'

export type NewTask = Omit<Task, 'id' | 'created_at' | 'updated_at'>

export async function getTasksForDate(dateStr: string): Promise<Task[]> {
  return db.tasks.where('scheduled_date').equals(dateStr).toArray()
}

export async function getTasksForWeek(weekStart: string): Promise<Task[]> {
  return db.tasks.where('week_start').equals(weekStart).toArray()
}

export async function getBacklogTasks(): Promise<Task[]> {
  return db.tasks
    .filter(t => t.scheduled_date == null && t.week_start == null && t.status === 'open')
    .toArray()
}

export async function addTask(task: NewTask): Promise<string> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.tasks.add({ ...task, id, created_at: now, updated_at: now })
  return id
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const now = new Date().toISOString()
  const patch: Partial<Task> = {
    status,
    updated_at: now,
    done_at: status === 'done' ? now : undefined,
  }
  await db.tasks.update(id, patch)
}

export async function updateTask(id: string, patch: Partial<NewTask>): Promise<void> {
  await db.tasks.update(id, { ...patch, updated_at: new Date().toISOString() })
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id)
}
