/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
      colors: {
        ink: '#183B3A',
        muted: '#718783',
        mint: '#DDF7E8',
        skywash: '#E8F6FF',
        canvas: '#F6FAFA',
      },
      boxShadow: {
        soft: '0 10px 32px rgba(28, 69, 65, 0.06)',
      },
    },
  },
  plugins: [],
};
