/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF7F7',
          100: '#FFF1F2',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#F87171',
          500: '#EF233C',
          600: '#D90429',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F8F9FB',
        },
        ink: {
          DEFAULT: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        line: '#E5E7EB',
        success: {
          DEFAULT: '#16A34A',
          bg: '#F0FDF4',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg: '#FFFBEB',
        },
        error: {
          DEFAULT: '#DC2626',
          bg: '#FEF2F2',
        },
        locked: '#9CA3AF',
      },
    },
  },
  plugins: [],
};
