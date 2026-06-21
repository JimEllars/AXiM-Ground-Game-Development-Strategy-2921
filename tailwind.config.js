/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        axim: {
          primary: '#1E3A8A', // Blue/Brand
          secondary: '#F59E0B', // Accent Warning (Yellow/Gold)
          success: '#10B981', // Accent Success (Green)
          danger: '#EF4444', // Accent Danger (Red)
          background: '#F8FAFC',
          paper: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}
