/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { brand: '#F5C518', ink: '#080808', charcoal: '#121212' },
      boxShadow: { glow: '0 0 30px rgba(245, 197, 24, .28)' },
    },
  },
  plugins: [],
};
