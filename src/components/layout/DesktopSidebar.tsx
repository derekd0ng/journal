import { useState, useEffect } from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

const COLLAPSE_KEY = 'daylog-sidebar-collapsed'

const TABS = [
  {
    to: '/today', label: 'Сегодня',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  },
  {
    to: '/plan', label: 'План',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>,
  },
  {
    to: '/analytics', label: 'Аналитика',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 20h18M7 16v-5M12 16V6M17 16v-8"/></svg>,
  },
  {
    to: '/settings', label: 'Настройки',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>,
  },
] as const

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === 'true'
  )

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed))
  }, [collapsed])

  const Logo = () => (
    <div
      aria-hidden="true"
      style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    </div>
  )

  const CollapseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
  )

  return (
    <nav
      aria-label="Основная навигация"
      className="hidden lg:flex flex-col shrink-0 border-r border-[var(--border)] transition-all duration-200"
      style={{
        width: collapsed ? 72 : 232,
        padding: '20px 12px',
        gap: 28,
        background: 'color-mix(in oklab, var(--muted) 45%, var(--background))',
      }}
    >
      {/* Header */}
      <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between px-1')}>
        {collapsed ? (
          <button
            aria-label="Развернуть меню"
            onClick={() => setCollapsed(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border-0 bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Logo />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-semibold text-base tracking-tight">DayLog</span>
            </div>
            <button
              aria-label="Свернуть меню"
              onClick={() => setCollapsed(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border-0 bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <CollapseIcon />
            </button>
          </>
        )}
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5">
        {TABS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={collapsed ? label : undefined}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg border transition-colors no-underline text-sm font-medium',
                collapsed ? 'h-11 w-11 justify-center border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]' : 'h-10 px-3',
                isActive
                  ? 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
              )
            }
          >
            {icon}
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-1">
        {!collapsed && (
          <p className="px-3 text-xs text-[var(--muted-foreground)]">
            Данные хранятся только в этом браузере
          </p>
        )}
        <p className={`px-3 text-xs font-mono text-[var(--muted-foreground)] opacity-50 ${collapsed ? 'text-center' : ''}`}>
          v0.0.10
        </p>
      </div>
    </nav>
  )
}
