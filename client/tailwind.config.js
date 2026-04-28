/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbf5',
          100: '#d6f5e6',
          500: '#20a66b',
          600: '#168556',
          700: '#126b47'
        }
      }
    }
  },
  plugins: []
};

