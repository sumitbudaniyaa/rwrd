/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Newsreader', 'Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        cream: {
          50: '#FDFCF7',
          100: '#FAF8F0',
          200: '#F4F0E1',
          300: '#EAE3CB',
        },
        charcoal: {
          900: '#141413',
          800: '#222220',
          700: '#3A3A37',
          500: '#706F6A',
          400: '#9B9990',
        },
        brand: {
          primary: '#1F2937',
          accent: '#10B981',
          gold: '#D97706',
        },
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
};
