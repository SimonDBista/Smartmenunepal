/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#121316',
        surface: {
          DEFAULT: '#16171B',
          card: '#1C1D23',
          hover: '#24262E',
          border: '#282A33',
          light: '#FAF8F5',
        },
        gold: {
          50: '#FAF6F0',
          100: '#F4ECE0',
          200: '#E8D7BE',
          300: '#DAC29D',
          400: '#C5A880', // signature warm champagne bronze from reference pictures
          500: '#C5A880',
          600: '#B6966B',
          700: '#A38155',
          800: '#8A6941',
          900: '#5A4228',
          950: '#3D2A18',
        },
        bronze: {
          50: '#FAF6F0',
          100: '#F4ECE0',
          200: '#E8D7BE',
          300: '#DAC29D',
          400: '#C5A880',
          500: '#C5A880',
          600: '#B6966B',
          700: '#A38155',
          800: '#8A6941',
          900: '#5A4228',
          950: '#3D2A18',
        },
        // Map brandPink to the same warm champagne bronze so no harsh pink appears
        brandPink: {
          50: '#FAF6F0',
          100: '#F4ECE0',
          200: '#E8D7BE',
          300: '#DAC29D',
          400: '#C5A880',
          500: '#C5A880',
          600: '#B6966B',
          700: '#A38155',
          800: '#8A6941',
          900: '#5A4228',
          950: '#3D2A18',
        },
        dark: {
          950: '#0E0F12',
          900: '#121316',
          850: '#16171B',
          800: '#1C1D23',
          750: '#23252D',
          700: '#2C2E38',
          600: '#3D404C',
          500: '#545866',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Cormorant Garamond', 'Cinzel', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Outfit', 'serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px -4px rgba(197, 168, 128, 0.35)',
        'pink-glow': '0 0 25px -4px rgba(197, 168, 128, 0.35)',
        'premium-card': '0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'inner-glow': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      },
      backgroundImage: {
        'radial-gold': 'radial-gradient(circle at 50% 0%, rgba(197, 168, 128, 0.12) 0%, transparent 70%)',
        'radial-pink': 'radial-gradient(circle at 50% 0%, rgba(197, 168, 128, 0.12) 0%, transparent 70%)',
        'mesh-dark': 'radial-gradient(at 0% 0%, rgba(197, 168, 128, 0.06) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(197, 168, 128, 0.06) 0px, transparent 50%)',
      },
      animation: {
        'pulse-slow': 'pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
