/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Colores de marca de la temporada activa (ver src/context/ThemeContext.tsx)
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          header: 'rgb(var(--brand-header) / <alpha-value>)',
          tint: 'rgb(var(--brand-tint) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}