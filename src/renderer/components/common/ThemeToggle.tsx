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
    // Suppress all transitions during the theme swap so the entire page
    // snaps rather than smearing across colors simultaneously.
    document.documentElement.classList.add('no-transitions');
    onToggle();
    // Force a reflow so the class takes effect before the next paint,
    // then remove on the following frame once the new theme is applied.
    void document.documentElement.offsetHeight;
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions');
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md bg-surface-elevated hover:bg-surface-card border border-hairline text-mute hover:text-ink focus:outline-none focus:ring-1 focus:ring-hairline-strong ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      {/* Cross-fade icons: outgoing scales down and blurs, incoming scales up */}
      <span
        key={isDark ? 'sun' : 'moon'}
        style={{
          display: 'inline-flex',
          animation: 'iconEnter 0.2s cubic-bezier(0.2, 0, 0, 1) forwards',
        }}
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-mute" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-mute" />
        )}
      </span>
      <style>{`
        @keyframes iconEnter {
          from { opacity: 0; transform: scale(0.25); filter: blur(4px); }
          to   { opacity: 1; transform: scale(1);    filter: blur(0px); }
        }
      `}</style>
    </button>
  );
};
