/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Aeonik', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['PP Fragment', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['Aeonik Fono', 'SF Mono', 'Monaco', 'monospace'],
      },
      colors: {
        plum: '#33063D',
        lavender: '#DAC0FD',
        iris: '#8A63E6',
        mint: '#C8F6C0',
        grey: '#F4F4F4',
      },
    },
  },
  plugins: [],
}
