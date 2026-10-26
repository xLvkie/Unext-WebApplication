/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#274DEA',
          hover: '#1E3BB8',
          light: '#EBF3FE'
        },
        secondary: {
          DEFAULT: '#8EB9FC',
          hover: '#79A7F5',
          text: '#1E3BB8'
        },
        accent: '#8EB9FC',
        success: {
          DEFAULT: '#10B981',
          light: '#DCFCE7'
        },
        match: {
          DEFAULT: '#C3A7FF',
          hover: '#B392F8',
          light: '#F5EEFF',
          dark: '#2E1065'
        },
        destructive: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          light: '#FEE2E2'
        },
        muted: {
          DEFAULT: '#6B7280',
          foreground: '#6B7280',
          light: '#F3F4F6'
        },
        warning: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          light: '#FEF3C7'
        },
        verification: {
          DEFAULT: '#059669',
          hover: '#047857',
          light: '#ECFDF5'
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

