import { Outlet, useLocation, useParams, Link, NavLink } from 'react-router-dom';
import { Blocks, LayoutDashboard, Code2, PlayCircle, MessageSquarePlus, FlaskConical } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL || 'https://github.com/qsbao/skill-web-ide/issues/new/choose';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ide', label: 'IDE', icon: Code2 },
  { to: '/playground', label: 'Playground', icon: PlayCircle },
  { to: '/prompt-lab', label: 'Prompt Lab', icon: FlaskConical },
];

function NavTabs() {
  const location = useLocation();
  const params = useParams<{ author: string; name: string }>();

  return (
    <nav className="flex items-center gap-0.5">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        // Match base path: /ide, /ide/:a/:n, /playground, /playground/:a/:n, etc.
        const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
        // For dashboard, also match /skills/* and /dashboard/* sub-routes
        const isDashActive = item.to === '/dashboard' && (
          location.pathname === '/dashboard' ||
          location.pathname.startsWith('/dashboard/') ||
          location.pathname.startsWith('/skills/')
        );

        const active = isActive || isDashActive;

        // Build the link target — preserve current skill context if applicable
        let href = item.to;
        if (params.author && params.name && item.to === '/ide') {
          href = `${item.to}/${params.author}/${params.name}`;
        }

        return (
          <Link
            key={item.to}
            to={href}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              active
                ? 'text-theme-accent bg-accent-subtle'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-surface-overlay/50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  return (
    <div className="h-screen flex flex-col bg-surface-base">
      {/* Global top bar */}
      <header className="header-bar flex items-center px-4 h-10 shrink-0 gap-3">
        <Link to="/dashboard" className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-accent-subtle text-theme-accent" title="Skill IDE">
          <Blocks className="w-4 h-4" />
        </Link>

        <div className="w-px h-4 bg-border-subtle" />

        <NavTabs />

        <div className="flex-1" />
        {/* <a
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-theme-secondary hover:text-theme-primary hover:bg-surface-overlay/50 transition-all duration-150"
          title="Report a bug or request a feature"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Feedback
        </a> */}
        <ThemeToggle />
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
