/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream:  '#F9F5F2',
        dark:   '#0e0d0c',
        gold:   '#b89a6a',
        'gold-lt': '#d4b98a',
        muted:  '#7a7269',
        border: '#e8e2da',
        taupe:  '#7d6b5e',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:  ['"Jost"', 'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        pulse2: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.2)', opacity: '0.7' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        toastIn: {
          '0%':   { opacity: '0', transform: 'translateX(-50%) translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
      },
      animation: {
        'fade-up':  'fadeUp 0.5s ease both',
        'spin-slow': 'spin 20s linear infinite',
        'spin-rev':  'spin 15s linear infinite reverse',
        'pulse2':    'pulse2 3s ease-in-out infinite',
        'slide-in':  'slideIn 0.35s cubic-bezier(0.4,0,0.2,1)',
        'toast-in':  'toastIn 0.3s ease both',
      },
    },
  },
  plugins: [],
}
