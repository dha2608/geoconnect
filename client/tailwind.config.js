/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Adaptive — pulled from CSS variables, auto-switch with data-theme */
        base: 'var(--bg-base)',
        elevated: 'var(--bg-elevated)',
        panel: 'var(--bg-panel)',
        accent: {
          primary: '#3b82f6',
          secondary: '#06b6d4',
          violet: '#8b5cf6',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
        txt: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        /* Surface tokens for hover/active/divider */
        surface: {
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)',
          divider: 'var(--surface-divider)',
        },
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        glass: '24px',
      },
      borderRadius: {
        glass: '16px',
      },
      animation: {
        'pulse-dot': 'pulseDot 2.2s ease-in-out infinite',
        'aurora': 'aurora 18s ease infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(2.2)', opacity: '0' },
        },
        aurora: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
