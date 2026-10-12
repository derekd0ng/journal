import { Outlet } from 'react-router'
import { BottomNav } from './BottomNav'
import { DesktopSidebar } from './DesktopSidebar'

export function AppShell() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <DesktopSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
        <BottomNav className="lg:hidden" />
      </div>
    </div>
  )
}
