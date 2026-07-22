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
        
        // Map slate/blue defaults for automatic backwards compatibility
        slate: {
          950: 'var(--bg-primary)',
          900: 'var(--bg-secondary)',
          850: 'var(--bg-card)',
          800: 'var(--border-color)',
          700: 'var(--text-secondary)',
          500: 'var(--text-muted)',
          400: 'var(--text-muted)',
          300: 'var(--text-secondary)',
          100: 'var(--text-primary)',
        },
        blue: {
          600: 'var(--accent-primary)',
          500: 'var(--accent-secondary)',
        }
      },
      boxShadow: {
        'brand': 'var(--shadow)',
        'modal': 'var(--shadow-modal)',
      }
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
}

