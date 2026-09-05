/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EEE8DA',
        surface: '#FFFDF8',
        ink: '#2A2118',
        inksoft: '#6B6153',
        walnut: {
          DEFAULT: '#6B4226',
          dark: '#452A18',
          light: '#8A5A38',
        },
        brass: {
          DEFAULT: '#AD8A50',
          light: '#D9C08F',
          dark: '#8A6C38',
        },
        sage: {
          DEFAULT: '#4C6B54',
          light: '#E4EAE1',
        },
        brick: {
          DEFAULT: '#9C4433',
          light: '#F1E2DD',
        },
        line: '#D9CFB8',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        num: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
