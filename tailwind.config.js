/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0F1511',
        surface: '#171E19',
        'surface-2': '#1F2822',
        line: '#2A332C',
        fg: '#F2F5F2',
        'fg-muted': '#9AA69E',
        'fg-dim': '#5E675F',
        accent: '#8DF06B',
        'accent-ink': '#0B1408',
        'accent-soft': '#1E2A18',
      },
    },
  },
  plugins: [],
};
