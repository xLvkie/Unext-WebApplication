/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2C4DE6',
          hover: '#2440C0',
          soft: '#E8EEFF',
        },
        secondary: {
          DEFAULT: '#8EBAF9',
          soft: '#E8F2FF',
        },
        success: {
          DEFAULT: '#12B886',
          soft: '#E5F8F2',
        },
        lavender: {
          DEFAULT: '#C3A7FC',
          soft: '#F3EEFF',
        },
        warning: {
          DEFAULT: '#F59D05',
          soft: '#FFF4DC',
        },
        danger: {
          DEFAULT: '#F24443',
          soft: '#FDECEC',
        },
        accent: '#01996A',
        ink: {
          DEFAULT: '#0F1217',
          muted: '#6B7280',
        },
        surface: '#F7F8FC',
        line: '#E6E8EE',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 24px rgba(44, 77, 230, 0.08)',
      },
    },
  },
  plugins: [],
};
