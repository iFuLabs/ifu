/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#1B3A5C',
        'brand-mid': '#2E5F8A',
        'brand-light': '#E8F2EE',
        accent: '#1A4D3C',
        'accent-light': '#E8F2EE',
        green: '#1D6648',
        'green-light': '#EFF6FF',
        danger: '#DC2626',
        warn: '#D97706',
        ink: '#1F2937',
        muted: '#6B7280',
        bg: '#F9FAFB',
        surface: '#F3F4F6',
        card: '#FFFFFF',
        border: '#E5E7EB',
      },
    },
  },
  plugins: [],
}
