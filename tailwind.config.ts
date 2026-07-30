import type { Config } from 'tailwindcss';

// Color names keep the COZYAI_next vocabulary so ported chat components work
// unchanged, but every value now resolves to a Momcozy 3.0 token variable
// (defined in app/momcozy-theme.css). Do not hardcode brand hex here.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          rose: {
            50: 'var(--colors-brands-mom-50)',
            100: 'var(--colors-brands-mom-100)',
            300: 'var(--colors-brands-mom-300)',
            500: 'var(--colors-brands-mom-900)',
            700: 'var(--colors-semantic-fills-mom-primary)',
          },
        },
        surface: {
          bg: 'var(--colors-backgrouds-primary)',
          bubble: 'var(--colors-grays-100)',
          card: 'var(--colors-backgrouds-secondary)',
        },
        text: {
          1: 'var(--colors-text-color-text-primary)',
          2: 'var(--colors-text-color-text-secondary)',
          muted: 'var(--colors-text-color-text-tertiary)',
        },
        momcozy: {
          border: 'var(--colors-border-primary)',
          'border-2': 'var(--colors-border-secondary)',
          'fill-mom': 'var(--colors-semantic-fills-mom-primary)',
          'label-mom': 'var(--colors-semantic-labels-mom-primary)',
        },
      },
      fontFamily: {
        sans: ['"Aeonik Soft Pro"', '-apple-system', 'system-ui', 'sans-serif'],
        aeonik: ['"Aeonik Soft Pro"', '-apple-system', 'system-ui', 'sans-serif'],
        brand: ['"Exposure[-10]"', 'serif'],
      },
      fontSize: {
        body18: ['18px', { lineHeight: '140%', fontWeight: '400' }],
        greet28: ['28px', { lineHeight: '140%', fontWeight: '400' }],
      },
      borderRadius: {
        pill: '296px',
      },
      keyframes: {
        cozySpin: { to: { transform: 'rotate(360deg)' } },
        cozyLightboxFade: { from: { opacity: '0' }, to: { opacity: '1' } },
        cozyDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'cozy-spin': 'cozySpin 0.9s linear infinite',
        'lightbox-in': 'cozyLightboxFade 200ms ease',
      },
    },
  },
  plugins: [],
};

export default config;
