import Dexie, { type EntityTable } from 'dexie'

export type CategoryKind = 'productive' | 'maintenance' | 'rest' | 'leisure'
export type TaskStatus = 'open' | 'done' | 'skipped'
export type HabitScheduleType = 'daily' | 'days_of_week' | 'times_per_week'
export type HabitCheckStatus = 'done' | 'skipped'

export interface Category {
  id: string
  name: string
  color: string
  kind: CategoryKind
  sort_order: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  category_id: string
  name: string
  is_preset: boolean
  sort_order: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  started_at: string
  ended_at: string
  activity_id?: string
  category_id?: string
  note?: string
  intentional?: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  scheduled_date?: string
  week_start?: string
  status: TaskStatus
  done_at?: string
  is_unplanned: boolean
  note?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Habit {
  id: string
  title: string
  schedule_type: HabitScheduleType
  days_of_week?: number[]
  times_per_week?: number
  active_from: string
  archived_at?: string
  created_at: string
  updated_at: string
}

export interface HabitCheck {
  id: string
  habit_id: string
  date: string
  status: HabitCheckStatus
  created_at: string
}

export interface Settings {
  id: 1
  timezone: string
  day_start_hour: number
  updated_at: string
}

export class DayLogDB extends Dexie {
  categories!: EntityTable<Category, 'id'>
  activities!: EntityTable<Activity, 'id'>
  time_entries!: EntityTable<TimeEntry, 'id'>
  tasks!: EntityTable<Task, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habit_checks!: EntityTable<HabitCheck, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('daylog')
    this.version(1).stores({
      categories: 'id, kind, sort_order, archived',
      activities: 'id, category_id, sort_order, archived',
      time_entries: 'id, started_at, ended_at, activity_id, category_id',
      tasks: 'id, scheduled_date, week_start, status',
      habits: 'id, schedule_type, archived_at',
      habit_checks: 'id, habit_id, date, [habit_id+date]',
      settings: 'id',
    })
    // v2: reset day_start_hour to 0 (midnight-to-midnight)
    this.version(2).stores({
      categories: 'id, kind, sort_order, archived',
      activities: 'id, category_id, sort_order, archived',
      time_entries: 'id, started_at, ended_at, activity_id, category_id',
      tasks: 'id, scheduled_date, week_start, status',
      habits: 'id, schedule_type, archived_at',
      habit_checks: 'id, habit_id, date, [habit_id+date]',
      settings: 'id',
    }).upgrade(tx =>
      tx.table('settings').toCollection().modify({ day_start_hour: 0 })
    )
  }
}

export const db = new DayLogDB()
