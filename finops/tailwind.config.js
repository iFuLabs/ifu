/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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
        brand: '#33063D',
        'brand-mid': '#8A63E6',
        'brand-light': '#DAC0FD',
        accent: '#8A63E6',
        'accent-light': '#DAC0FD',
        primary: '#33063D',
        secondary: '#8A63E6',
        danger: '#DC2626',
        warn: '#D97706',
        ink: '#33063D',
        muted: '#8A63E6',
        bg: '#FFFFFF',
        surface: '#F4F4F4',
        card: '#FFFFFF',
        border: '#DAC0FD',
      },
    },
  },
  plugins: [],
}
