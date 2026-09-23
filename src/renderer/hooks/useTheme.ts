import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('medbuddy-theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'light'; // Light theme primary per Designv2.md
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.removeAttribute('data-theme');
      root.classList.add('light');
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('medbuddy-theme', theme);
    } catch {
      // Ignore localStorage errors
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' };
};
