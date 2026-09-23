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

  const handleToggle = () => {
    // Suppress transitions during the theme swap so the entire page snaps
    document.documentElement.classList.add('no-transitions');
    onToggle();
    void document.documentElement.offsetHeight;
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions');
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-sm bg-surface border border-border text-secondary hover:text-primary hover:bg-surface-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-vault-500/40 ${className}`}
      title={isDark ? 'Switch to Light theme (Default)' : 'Switch to Dark theme'}
      aria-label="Toggle visual theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-secondary" strokeWidth={1.75} />
      ) : (
        <Moon className="w-4 h-4 text-secondary" strokeWidth={1.75} />
      )}
    </button>
  );
};
