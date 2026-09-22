/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
          card: 'rgb(var(--color-surface-card) / <alpha-value>)',
          button: 'rgb(var(--color-surface-button) / <alpha-value>)'
        },
        hairline: {
          DEFAULT: 'rgb(var(--color-hairline) / <alpha-value>)',
          soft: 'var(--color-hairline-soft)',
          strong: 'var(--color-hairline-strong)'
        },
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        body: 'rgb(var(--color-body) / <alpha-value>)',
        charcoal: 'rgb(var(--color-charcoal) / <alpha-value>)',
        mute: 'rgb(var(--color-mute) / <alpha-value>)',
        ash: 'rgb(var(--color-ash) / <alpha-value>)',
        stone: 'rgb(var(--color-stone) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          pressed: 'rgb(var(--color-primary-pressed) / <alpha-value>)',
          text: 'rgb(var(--color-primary-text) / <alpha-value>)'
        },
        accent: {
          blue: 'rgb(var(--color-accent-blue) / <alpha-value>)',
          'blue-soft': 'var(--color-accent-blue-soft)',
          red: 'rgb(var(--color-accent-red) / <alpha-value>)',
          'red-soft': 'var(--color-accent-red-soft)',
          green: 'rgb(var(--color-accent-green) / <alpha-value>)',
          'green-soft': 'var(--color-accent-green-soft)',
          yellow: 'rgb(var(--color-accent-yellow) / <alpha-value>)',
          'yellow-soft': 'var(--color-accent-yellow-soft)',
        }
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', '"SF Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
