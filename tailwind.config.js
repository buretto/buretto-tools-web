/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        buretto: {
          primary: '#1a1a1a',
          secondary: '#f59e0b',
          accent: '#6b7280',
          light: '#f9fafb'
        }
      },
      fontFamily: {
        'sans': ['Roboto', 'ui-sans-serif', 'system-ui']
      }
    },
  },
  plugins: [],
}