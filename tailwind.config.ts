import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        'paper-2': '#EFEDE6',
        surface: '#FBFAF6',
        'surface-hi': '#FFFFFF',
        ink: {
          DEFAULT: '#0F0E0C',
          2: '#2A2926',
          3: '#6E6B65',
          4: '#9F9C95',
        },
        hair: '#E5E1D8',
        'hair-2': '#D3CFC4',
        cinnabar: {
          DEFAULT: '#EE4523',
          2: '#D13911',
          3: '#FF7458',
        },
        sage: '#5E6B47',
        ochre: '#C08B3C',
        positive: '#00875A',
        warning: '#DE6B1F',
      },
      fontFamily: {
        display: ['var(--font-mona)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '10px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        lift: '0 20px 40px -18px rgba(15, 14, 12, 0.18), 0 2px 6px -2px rgba(15, 14, 12, 0.04)',
        soft: '0 2px 6px -2px rgba(15, 14, 12, 0.04)',
      },
      transitionTimingFunction: {
        ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'lift-in': 'liftIn 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        liftIn: {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
