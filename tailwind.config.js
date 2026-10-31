/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111F', navy: '#0B1830', royal: '#246BFD', sky: '#4B8DFF',
        mist: '#F5F7FB', slate2: '#68758A', line: '#E1E7F0',
        ok: '#15966A', warn: '#D99727', bad: '#D94B5B'
      },
      fontFamily: { sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '14px' },
      boxShadow: { card: '0 1px 2px rgba(7,17,31,.06), 0 4px 16px rgba(7,17,31,.06)' }
    }
  },
  plugins: []
};
