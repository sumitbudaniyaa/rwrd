/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        admin: {
          bg: '#FFFFFF',
          surface: '#F9FAFB',
          border: '#E5E7EB',
          accent: '#4F46E5', // Single secondary/accent color
          accentLight: '#EEF2FF',
          textMain: '#111827',
          textMuted: '#6B7280',
        },
      },
    },
  },
  plugins: [],
};
