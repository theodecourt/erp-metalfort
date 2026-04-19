/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'mf-black': 'var(--mf-black)',
        'mf-black-soft': 'var(--mf-black-soft)',
        'mf-yellow': 'var(--mf-yellow)',
        'mf-yellow-hover': 'var(--mf-yellow-hover)',
        'mf-bg-light': 'var(--mf-bg-light)',
        'mf-border': 'var(--mf-border)',
        'mf-success': 'var(--mf-success)',
        'mf-warning': 'var(--mf-warning)',
        'mf-danger': 'var(--mf-danger)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
