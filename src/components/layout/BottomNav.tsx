import { NavLink } from 'react-router'
import { CalendarDays, ListTodo, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/today',     label: 'Сегодня',   Icon: CalendarDays },
  { to: '/plan',      label: 'План',       Icon: ListTodo },
  { to: '/analytics', label: 'Аналитика', Icon: BarChart3 },
  { to: '/settings',  label: 'Настройки', Icon: Settings },
] as const

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--background)] pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                )
              }
            >
              <Icon size={22} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
