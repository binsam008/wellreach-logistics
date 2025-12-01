/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          700: '#1a237e',
          800: '#0d1b3e',
          900: '#070d1f',
        },
        brand: {
          orange: '#f97316',
          purple: '#6d28d9',
        },
      },
    },
  },
  plugins: [],
};
