/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-sans)'],
        mono: ['var(--font-sans)'],
        code: ['var(--font-code)'],
      },
      borderRadius: {
        xs: '4px',
      },
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-card': 'var(--bg-card)',
        'bg-modal': 'var(--bg-modal)',
        'bg-hover': 'var(--bg-hover)',
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-success': 'var(--accent-success)',
        'accent-warning': 'var(--accent-warning)',
        'accent-danger': 'var(--accent-danger)',
        'accent-info': 'var(--accent-info)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-color': 'var(--border-color)',
        'border-input': 'var(--border-input)',
        'shell-bg': 'var(--shell-bg)',
        'shell-text': 'var(--shell-text)',
        'shell-accent': 'var(--shell-accent)',
        
        // Map blue default for automatic backwards compatibility
        blue: {
          600: 'var(--accent-primary)',
          500: 'var(--accent-secondary)',
        }
      },
      boxShadow: {
        'brand': 'var(--shadow)',
        'modal': 'var(--shadow-modal)',
        '2xs': '0 1px 2px rgba(16,24,40,.05)',
        'press': 'none',
      }
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
}
