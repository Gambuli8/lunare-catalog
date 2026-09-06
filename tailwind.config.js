/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream:  '#F9F5F2',
        paper:  '#ffffff',
        dark:   '#0e0d0c',
        // El oro pasa de #b89a6a a #8f7647: sobre crema, el anterior no
        // llegaba a contraste AA en los textos chicos.
        gold:   '#8f7647',
        'gold-lt': '#b89a6a',
        // Igual el gris de texto: de #7a7269 (4,3:1) a #5f574e (6,5:1).
        muted:  '#5f574e',
        soft:   '#7a7269',
        border: '#e8e2da',
        line:   '#efeae3',
        taupe:  '#7d6b5e',
        sale:   '#a8322a',
        wa:     '#0f7a41',
        'wa-dark': '#0c6836',
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
        'slide-in':  'slideIn 0.35s cubic-bezier(0.4,0,0.2,1)',
        'toast-in':  'toastIn 0.3s ease both',
      },
    },
  },
  plugins: [],
}
