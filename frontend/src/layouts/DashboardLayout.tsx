import { Outlet, useLocation, Link } from 'react-router-dom';
import { Layers, History } from 'lucide-react';

const SIDEBAR_ITEMS = [
  { to: '/dashboard/skills', label: 'Skills', icon: Layers },
  { to: '/dashboard/sessions', label: 'Sessions', icon: History },
];

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 bg-surface-raised border-r border-border-subtle flex flex-col py-2 px-2 gap-0.5">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.to || location.pathname.startsWith(item.to + '/');

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all duration-150 ${
                isActive
                  ? 'text-theme-accent bg-accent-subtle'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-surface-overlay/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
