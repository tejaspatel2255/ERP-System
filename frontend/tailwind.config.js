/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary':    'var(--bg-primary)',
        'bg-secondary':  'var(--bg-secondary)',
        'bg-card':       'var(--bg-card)',
        'bg-modal':      'var(--bg-modal)',
        'bg-hover':      'var(--bg-hover)',
        'accent-primary':   'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-success':   'var(--accent-success)',
        'accent-warning':   'var(--accent-warning)',
        'accent-danger':    'var(--accent-danger)',
        'accent-info':      'var(--accent-info)',
        'accent-ink':       'var(--accent-ink)',
        'on-accent':        'var(--on-accent)',
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',
        'border-color':   'var(--border-color)',
        'border-strong':  'var(--border-strong)',

        // Map blue default for automatic backwards compatibility
        blue: {
          600: 'var(--accent-primary)',
          500: 'var(--accent-secondary)',
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans:    ['var(--font-sans)'],
        mono:    ['var(--font-mono)'],
      },
      borderRadius: {
        xs: '2px',
      },
      boxShadow: {
        'brand':  'var(--shadow)',
        'modal':  'var(--shadow-modal)',
        '2xs':    '0 1px 0 rgba(0,0,0,.06)',
        'press':  'var(--shadow-press)',
      }
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
}
