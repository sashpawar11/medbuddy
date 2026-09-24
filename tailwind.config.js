/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Raw Token Scales (§16)
        ink: {
          25: 'var(--ink-25)',
          50: 'var(--ink-50)',
          100: 'var(--ink-100)',
          200: 'var(--ink-200)',
          300: 'var(--ink-300)',
          400: 'var(--ink-400)',
          500: 'var(--ink-500)',
          600: 'var(--ink-600)',
          700: 'var(--ink-700)',
          800: 'var(--ink-800)',
          900: 'var(--ink-900)',
        },
        vault: {
          50: 'var(--vault-50)',
          100: 'var(--vault-100)',
          200: 'var(--vault-200)',
          300: 'var(--vault-300)',
          400: 'var(--vault-400)',
          500: 'var(--vault-500)',
          600: 'var(--vault-600)',
          700: 'var(--vault-700)',
          800: 'var(--vault-800)',
          900: 'var(--vault-900)',
        },
        sage: {
          100: 'var(--sage-100)',
          300: 'var(--sage-300)',
          600: 'var(--sage-600)',
        },
        amber: {
          100: 'var(--amber-100)',
          300: 'var(--amber-300)',
          600: 'var(--amber-600)',
        },
        clay: {
          100: 'var(--clay-100)',
          300: 'var(--clay-300)',
          600: 'var(--clay-600)',
        },
        teal: {
          100: 'var(--teal-100)',
          300: 'var(--teal-300)',
          600: 'var(--teal-600)',
        },
        violet: {
          100: 'var(--violet-100)',
          300: 'var(--violet-300)',
          600: 'var(--violet-600)',
        },

        // Semantic Backgrounds & Surfaces
        app: 'var(--color-bg-app)',
        surface: {
          DEFAULT: 'var(--color-bg-surface)',
          recessed: 'var(--color-bg-recessed)',
          hover: 'var(--color-bg-hover)',
        },

        // Semantic Borders
        border: {
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
        },

        // Semantic Text
        primary: {
          DEFAULT: 'var(--color-text-primary)',
          hover: 'var(--color-brand-hover)',
          onBrand: 'var(--color-text-on-brand)',
        },
        secondary: 'var(--color-text-secondary)',
        tertiary: 'var(--color-text-tertiary)',
        disabled: 'var(--color-text-disabled)',

        // Brand Action
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['28px', { lineHeight: '36px', fontWeight: '600' }],
        h1: ['22px', { lineHeight: '30px', fontWeight: '600' }],
        h2: ['17px', { lineHeight: '24px', fontWeight: '600' }],
        h3: ['15px', { lineHeight: '22px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '21px', fontWeight: '400' }],
        'body-medium': ['14px', { lineHeight: '21px', fontWeight: '500' }],
        small: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'metric-lg': ['32px', { lineHeight: '38px', fontWeight: '700' }],
        'metric-sm': ['20px', { lineHeight: '26px', fontWeight: '600' }],
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '7': 'var(--space-7)',
        '8': 'var(--space-8)',
        '9': 'var(--space-9)',
        '10': 'var(--space-10)',
      },
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.2, 0, 0, 1)',
        'out': 'cubic-bezier(0.2, 0, 0, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
      },
      transitionDuration: {
        '80': '80ms',
        '180': '180ms',
        '200': '200ms',
      },
    },
  },
  plugins: [],
}
