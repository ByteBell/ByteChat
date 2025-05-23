
/** @type {import('tailwindcss').Config} */
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/**/*.html',
    './manifest.json',
  ],
  theme: {
    extend: {
      colors: {
        // header gold
        brand: {
          light: '#F2C46F',    // panel button background
          DEFAULT: '#DEAA4E',  // header background
          dark: '#C4943B',     // hover states
        },
        mint: {
          light: '#E6FAF5',    // panel background
          DEFAULT: '#AFF1E0',  // input borders & selects
          dark: '#2E6D71',     // panel border
        },
        text: {
          DEFAULT: '#134E4A',  // deep teal text
        }
      }
    }
  },
  plugins: [],
}
