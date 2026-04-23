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
        bg: '#FFFFFF',
        ink: '#33063D',
        muted: '#8A63E6',
        border: '#DAC0FD',
        card: '#FFFFFF',
        accent: {
          DEFAULT: '#8A63E6',
          light: '#DAC0FD',
          dark: '#33063D',
        },
        primary: '#33063D',
        secondary: '#8A63E6',
        danger: '#C84B31',
        warn: '#C87A1A',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
