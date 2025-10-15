/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rl-primary': '#3B82F6',
        'rl-secondary': '#334155',
        'rl-success': '#16A34A',
        'rl-warning': '#D97706',
        'rl-critical': '#DC2626',
        'rl-background': '#0F172A',
        'rl-surface': '#1E293B',
        'rl-on-primary': '#FFFFFF',
        'rl-on-surface': '#E2E8F0',
      },
      fontFamily: {
        sans: ['Assistant', 'sans-serif'],
      },
      borderRadius: {
        'rl': '8px',
      },
      gridTemplateAreas: {
        'desktop': [
          'header header',
          'sidebar main',
        ],
      },
      gridTemplateColumns: {
        'desktop': '280px 1fr',
      },
      gridTemplateRows: {
        'desktop': 'auto 1fr',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.grid-areas-desktop': {
          gridTemplateAreas: `
            "header header"
            "sidebar main"
          `,
        },
      }
      addUtilities(newUtilities)
    }
  ],
}
