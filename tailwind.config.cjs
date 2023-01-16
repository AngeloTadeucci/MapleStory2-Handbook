const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    screens: {
      'xs': '320px',
      ...defaultTheme.screens,
    },
    extend: {
      colors: {
        'header-black': '#1b1d1e',
        'red': '#e93b3b',
        'gold': '#ffd200',
      }
    }
  },
  plugins: [require('@tailwindcss/line-clamp')]
};