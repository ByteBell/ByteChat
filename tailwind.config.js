
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/**/*.html',
    './manifest.json'              // if you ever inline classes in there

  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
