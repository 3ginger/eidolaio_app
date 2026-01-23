/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // From Eidola logo
        'eidola-text': '#2d3748',
        'eidola-bg': '#f8f6f3',
        'eidola-orange': '#ff8c42',
        'eidola-magenta': '#9b59b6',
        'eidola-teal': '#1abc9c',
        'eidola-pink': '#e91e63',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
