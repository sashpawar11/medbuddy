import React from 'react';
import { Sun, Moon } from 'lucide-react';
import type { ThemeMode } from '../../hooks/useTheme';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  className = '',
}) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex items-center justify-center p-2 rounded-md bg-surface-elevated hover:bg-surface-card border border-hairline text-mute hover:text-ink transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-accent-blue/40 ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-accent-yellow transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-accent-blue transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
};
