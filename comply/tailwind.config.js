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
        // Official Brand Colors
        plum: '#33063D',
        lavender: '#DAC0FD',
        iris: '#8A63E6',
        mint: '#C8F6C0',
        grey: '#F4F4F4',
        white: '#FFFFFF',
        
        // Semantic mappings
        bg: '#F8F7FA',
        ink: '#33063D',
        muted: 'rgba(51, 6, 61, 0.65)',
        border: 'rgba(51, 6, 61, 0.12)',
        'border-emphasis': 'rgba(51, 6, 61, 0.20)',
        card: '#FFFFFF',
        surface: '#F8F7FA',
        'surface-hover': '#FAFAFB',
        accent: {
          DEFAULT: '#8A63E6',
          light: 'rgba(138, 99, 230, 0.08)',
          dark: '#33063D',
        },
        primary: '#33063D',
        secondary: '#8A63E6',
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
