/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0d0f14',
        surface: '#151820',
        s2:      '#1b1e27',
        s3:      '#1e222e',
        card:    '#1b1e27',
        accent:  '#ff6b35',
        a2:      '#ff8c60',
        gold:    '#f5c842',
        muted:   '#8a94a6',
        m2:      '#f0f2f5',
      },
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        body:    ['Barlow', 'sans-serif'],
      }
    }
  },
  plugins: []
}
