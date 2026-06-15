/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#f0f5ff',
        surface: '#ffffff',
        s2:      '#f8faff',
        s3:      '#f0f5ff',
        card:    '#ffffff',
        accent:  '#1352c9',
        a2:      '#4a7ee8',
        gold:    '#f5c842',
        muted:   '#4a5978',
        m2:      '#0a1428',
      },
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        body:    ['Barlow', 'sans-serif'],
      }
    }
  },
  plugins: []
}
