import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="btn-ghost p-1.5 rounded-lg"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={16} className="text-slate-400 hover:text-amber-400 transition-colors" />
      ) : (
        <Moon size={16} className="text-slate-500 hover:text-indigo-500 transition-colors" />
      )}
    </button>
  );
}
