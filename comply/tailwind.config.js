/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'sans-serif'],
        serif: ['var(--font-instrument)', 'serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        bg:     '#F7F6F2',
        ink:    '#0D0D0D',
        muted:  '#6B6B6B',
        border: '#E2E0D8',
        card:   '#FFFFFF',
        accent: {
          DEFAULT: '#1A4D3C',
          light:   '#E8F2EE',
          mid:     '#2A7A5C',
        },
        green: {
          DEFAULT: '#1D6648',
          light:   '#EAF3EE',
        },
        danger: '#C84B31',
        warn:   '#C87A1A',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
