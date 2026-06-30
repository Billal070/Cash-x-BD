/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D1117', // Deep dark
        cardBg: '#1A2332',     // Dark blue-gray card
        primary: '#22C55E',    // Emerald Green
        accent: '#FBBF24',     // Gold/Amber
        textLight: '#F0F6FF',  // Off-white text
        textGray: '#8B949E',   // Muted gray text
      },
    },
  },
  plugins: [],
}
