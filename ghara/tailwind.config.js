/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Aeonik', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['PP Fragment', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['Aeonik Fono', 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', 'monospace'],
      },
      colors: {
        // Ghara brand palette (CSS vars for easy swap)
        brand: {
          DEFAULT: 'var(--brand)',
          light: 'var(--brand-light)',
          dark: 'var(--brand-dark)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
        },

        // Semantic mappings
        bg: 'var(--bg)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        'border-emphasis': 'var(--border-emphasis)',
        card: 'var(--card)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        primary: 'var(--brand)',
        secondary: 'var(--accent)',
        danger: '#B42318',
        'danger-bg': '#FEF3F2',
        warn: '#B54708',
        'warn-bg': '#FFFAEB',
        green: {
          DEFAULT: '#067647',
          light: '#ECFDF3',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
