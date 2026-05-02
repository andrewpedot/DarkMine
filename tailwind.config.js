/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        neon: {
          purple: '#a855f7',
          'purple-bright': '#c084fc',
          'purple-glow': '#7c3aed',
          green: '#22d3ee',
          'green-bright': '#34d399',
        },
        dark: {
          950: '#080b12',
          900: '#0d1117',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
          500: '#4b5563',
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.35), 0 0 60px rgba(168, 85, 247, 0.1)',
        'neon-green': '0 0 20px rgba(52, 211, 153, 0.35), 0 0 60px rgba(52, 211, 153, 0.1)',
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(168, 85, 247, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(168, 85, 247, 0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(168, 85, 247, 0.8), 0 0 50px rgba(168, 85, 247, 0.3)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
