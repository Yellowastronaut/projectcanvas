/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Main palette
        bg: '#ecf1f6',
        text: '#2f2959',
        muted: {
          DEFAULT: '#94a0b8',
          light: '#d4dbe8',
          medium: '#b4bdcc',
        },
        // Component colors
        canvas: {
          bg: '#ecf1f6',
          grid: '#d4dbe8',
        },
        chat: {
          bg: '#ffffff',
          user: '#2f2959',
          assistant: '#d4dbe8',
        }
      }
    },
  },
  plugins: [],
}
