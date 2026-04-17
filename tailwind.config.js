/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:      '#2d43d0',
        accent:       '#ff7900',
        navy:         '#02106c',
        'gray-light': '#edecee',
        'gray-dark':  '#606060',
      },
      fontFamily: {
        archivo: ['Archivo', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.07)',
      },
    },
  },
  plugins: [],
}
