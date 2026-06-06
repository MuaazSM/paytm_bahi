/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'paytm-blue':        '#00BAF2',
        'paytm-blue-dark':   '#002970',
        'paytm-navy':        '#20336B',
        'paytm-sky-tint':    '#E6F7FE',
        'sarvam-accent':     '#FF6B35',
        'sarvam-accent-tint':'#FFF0EA',
        'bg':                '#F4F6F9',
        'surface':           '#FFFFFF',
        'text-primary':      '#0A0F2C',
        'text-secondary':    '#5B6478',
        'border':            '#E4E8EF',
        'success':           '#1FA463',
        'warning':           '#F5A623',
        'danger':            '#E5484D',
      },
    },
  },
  plugins: [],
};
