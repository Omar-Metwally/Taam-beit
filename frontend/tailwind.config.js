/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9f0',
          100: '#dcf0dc',
          200: '#bbe3bb',
          300: '#8ecd8e',
          400: '#5cb05c',
          500: '#2D7A2D', // primary green — buttons, logo, active nav
          600: '#256325',
          700: '#1e4f1e',
          800: '#1a401a',
          900: '#163516',
          950: '#0a1f0a',
        },
        forest: '#1E5C1E',   // footer background
        cream:  '#FAFAF7',   // page background tint
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(0,0,0,0.08)',
        'card-hover': '0 8px 32px 0 rgba(0,0,0,0.14)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
