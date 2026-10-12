import { useRef, useState } from 'react'
import { exportBackup, downloadBackup, importBackup } from '@/db/backup'
import type { ImportResult } from '@/db/backup'

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

export function Settings() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [exportStatus, setExportStatus] = useState<Status>({ kind: 'idle' })
  const [importStatus, setImportStatus] = useState<Status>({ kind: 'idle' })

  async function handleExport() {
    setExportStatus({ kind: 'loading' })
    try {
      const data = await exportBackup()
      downloadBackup(data)
      const total = data.time_entries.length + data.tasks.length + data.habits.length
      setExportStatus({ kind: 'success', message: `Скачан файл с ${total} записями` })
    } catch (e) {
      setExportStatus({ kind: 'error', message: String(e) })
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!fileRef.current) return
    fileRef.current.value = ''
    if (!file) return

    setImportStatus({ kind: 'loading' })
    try {
      const text = await file.text()
      const json: unknown = JSON.parse(text)
      const result: ImportResult = await importBackup(json)
      if (result.ok && result.counts) {
        const c = result.counts
        setImportStatus({
          kind: 'success',
          message: `Импортировано: ${c.time_entries} записей, ${c.tasks} задач, ${c.habits} привычек, ${c.categories} категорий`,
        })
      } else {
        setImportStatus({ kind: 'error', message: result.error ?? 'Неизвестная ошибка' })
      }
    } catch (e) {
      setImportStatus({ kind: 'error', message: `Не удалось прочитать файл: ${String(e)}` })
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24 lg:pb-8 flex flex-col gap-8">
        <h1 className="text-2xl font-bold">Настройки</h1>

        {/* Backup section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Резервная копия</h2>
          <p className="text-sm text-[var(--muted-foreground)] -mt-2">
            Данные хранятся только в этом браузере. Экспортируйте бэкап перед переустановкой или сменой браузера.
          </p>

          {/* Export */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Экспорт данных</p>
                <p className="text-xs text-[var(--muted-foreground)]">Скачать всё как JSON-файл</p>
              </div>
              <button
                onClick={() => void handleExport()}
                disabled={exportStatus.kind === 'loading'}
                className="h-9 px-4 rounded-[10px] bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium shrink-0 disabled:opacity-50"
              >
                {exportStatus.kind === 'loading' ? 'Экспорт…' : 'Скачать'}
              </button>
            </div>
            <StatusLine status={exportStatus} />
          </div>

          {/* Import */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Импорт данных</p>
                <p className="text-xs text-[var(--muted-foreground)]">Загрузить ранее сохранённый JSON</p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={importStatus.kind === 'loading'}
                className="h-9 px-4 rounded-[10px] border border-[var(--border)] bg-[var(--background)] text-sm font-medium shrink-0 disabled:opacity-50"
              >
                {importStatus.kind === 'loading' ? 'Загрузка…' : 'Выбрать файл'}
              </button>
            </div>
            <StatusLine status={importStatus} />
            {importStatus.kind === 'idle' && (
              <p className="text-xs text-[var(--muted-foreground)] flex items-start gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>
                Импорт полностью заменяет все текущие данные
              </p>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={e => void handleFileChange(e)}
          />
        </section>

        {/* Placeholder for future settings */}
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Категории и привычки</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Фаза 4</p>
        </section>
      </div>
    </div>
  )
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle' || status.kind === 'loading') return null
  return (
    <p className={`text-xs flex items-start gap-1.5 ${status.kind === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
      {status.kind === 'success' ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>
      )}
      {status.message}
    </p>
  )
}
