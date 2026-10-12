# DayLog — правила проекта

Личное PWA-приложение для учёта времени, задач и привычек. Один пользователь,
данные хранятся локально в IndexedDB. Без сервера, без авторизации.

Спецификация: `docs/DayLog — хенд-офф для Claude Code.md`

## Стек

| Слой | Выбор |
|---|---|
| Фреймворк | Vite + React 19, TypeScript strict |
| Роутинг | React Router v7 (SPA-режим) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Графики | Recharts |
| Даты | date-fns + date-fns-tz |
| БД | Dexie.js (IndexedDB) |
| Состояние | TanStack Query |
| Валидация | Zod |
| PWA | vite-plugin-pwa (Workbox под капотом) |
| Тесты | Vitest (unit) + Playwright (E2E, 2–3 сценария) |
| Пакет-менеджер | pnpm |

## Структура папок

```
src/
  main.tsx         точка входа
  App.tsx          роутер + провайдеры
  pages/
    Today.tsx
    Plan.tsx
    Analytics.tsx
    Settings.tsx
  components/      переиспользуемые компоненты
    layout/        (BottomNav, AppShell)
  db/              ЕДИНСТВЕННОЕ место доступа к IndexedDB
    schema.ts      (Dexie-класс, все таблицы)
    seed.ts        (начальные категории и пресеты)
    entries.ts     (CRUD time_entries)
    tasks.ts       (CRUD tasks)
    habits.ts      (CRUD habits + habit_checks)
    categories.ts
    settings.ts
lib/
  time/            ВСЯ логика дат/времени/часовых поясов
    index.ts
  analytics/       чистые функции расчёта метрик (без побочных эффектов)
    index.ts
public/
  icons/
docs/
```

## Команды

```bash
pnpm dev        # дев-сервер (localhost:5173)
pnpm build      # статическая сборка в dist/
pnpm preview    # предпросмотр production-сборки локально
pnpm test       # Vitest (unit-тесты lib/)
pnpm test:e2e   # Playwright
pnpm lint       # ESLint + tsc --noEmit
```

## Обязательные правила

### 1. Время — только через `lib/time`
Любое сравнение, форматирование, нарезка интервалов, граница дня (`day_start_hour`),
часовой пояс — только через функции из `lib/time`. Прямой вызов `new Date()`,
`Date.now()`, `getHours()` и т.п. в компонентах и `src/db` запрещён.

### 2. Данные — только через `src/db`
UI-компоненты и страницы обращаются к IndexedDB исключительно через модули
`src/db/*`. Прямой вызов Dexie-объектов за пределами `src/db/` запрещён.

### 3. TypeScript strict, без `any`
`tsconfig.json`: `"strict": true`. Использование `any` запрещено; вместо него —
`unknown` с явным сужением типа или точный тип из схемы.

### 4. `lib/analytics` — чистые функции
Никаких обращений к Dexie и никаких побочных эффектов. Принимают данные как
аргументы, возвращают результат. Полное покрытие unit-тестами.

### 5. Скоуп MVP
Не добавлять фичи за пределами SPEC.md без явного запроса. Если в спеке
противоречие или пробел — спросить, не додумывать.

## Модель данных (IndexedDB / Dexie)

Шесть основных сторов + `settings`. Нет `user_id` (один пользователь).
Все времена хранятся как ISO-строки UTC; часовой пояс и граница дня (`day_start_hour`)
берутся из `settings`.

| Стор | Ключевые поля |
|---|---|
| `categories` | `id`, `name`, `color`, `kind`, `sort_order`, `archived` |
| `activities` | `id`, `category_id`, `name`, `is_preset`, `sort_order`, `archived` |
| `time_entries` | `id`, `started_at`, `ended_at`, `activity_id?`, `category_id?`, `note?`, `intentional?` |
| `tasks` | `id`, `title`, `scheduled_date?`, `week_start?`, `status`, `done_at?`, `is_unplanned`, `note?`, `sort_order` |
| `habits` | `id`, `title`, `schedule_type`, `days_of_week?`, `times_per_week?`, `active_from`, `archived_at?` |
| `habit_checks` | `id`, `habit_id`, `date`, `status` |
| `settings` | `id` (единственная запись), `timezone`, `day_start_hour` |

## Правила целостности (проверяются в `src/db`)

- `time_entries`: интервалы не пересекаются; `ended_at > started_at`; длина ≤ 24 ч
- При конфликте интервалов — UI предлагает обрезать соседний, не сохраняет молча
- Для задачи задан один из: `scheduled_date`, `week_start`, либо ни того ни другого (бэклог)
- Уникальность `(habit_id, date)` в `habit_checks`

## Конец каждой фазы

1. `pnpm test && pnpm lint` — должно быть зелёным
2. Перечислить, что сделано
3. Что проверить руками на телефоне
4. Какие решения приняты самостоятельно
