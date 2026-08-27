/** @type {import('tailwindcss').Config} */
// Single canonical Tailwind config. The legacy tailwind.config.js was removed in
// v0.9.33 — it shadowed this file in Tailwind's resolution order, so fontFamily,
// shadows and animations defined here were silently never generated.
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'Iowan Old Style', 'Palatino Linotype', 'Georgia', 'serif'],
      },
      colors: {
        // oklch teal palette — perceptually uniform, dark-mode ready.
        // `<alpha-value>` placeholder is REQUIRED: Tailwind v3 cannot parse raw
        // oklch() strings for opacity modifiers (brand-500/10 etc.) without it.
        brand: {
          50:  'oklch(0.984 0.014 181 / <alpha-value>)',
          100: 'oklch(0.963 0.037 182 / <alpha-value>)',
          200: 'oklch(0.935 0.077 181 / <alpha-value>)',
          300: 'oklch(0.894 0.122 180 / <alpha-value>)',
          400: 'oklch(0.833 0.145 180 / <alpha-value>)',
          500: 'oklch(0.714 0.145 181 / <alpha-value>)',
          600: 'oklch(0.607 0.126 182 / <alpha-value>)',
          700: 'oklch(0.511 0.096 186 / <alpha-value>)',
          800: 'oklch(0.437 0.078 188 / <alpha-value>)',
          900: 'oklch(0.374 0.056 185 / <alpha-value>)',
          950: 'oklch(0.237 0.034 184 / <alpha-value>)',
        },
        // Enterprise dark app surfaces (.governance/ui_ux_rules.md):
        // page bg #060c18 / #080e1e, cards = white alpha overlays on top.
        ink: {
          base:   '#060c18', // app page background
          deep:   '#080e1e', // alternate page background / header bands
          panel:  '#0b1426', // opaque raised panel (modals, dropdowns)
          raised: '#101b30', // hover state of opaque panels
        },
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 4px 16px -2px rgb(15 23 42 / 0.06)',
        'card-md': '0 4px 24px -4px rgb(15 23 42 / 0.10), 0 1px 4px 0 rgb(15 23 42 / 0.06)',
        'card-lg': '0 18px 60px -8px rgb(15 23 42 / 0.12), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
        'inset-brand': 'inset 0 1px 0 rgb(255 255 255 / 0.12)',
        // Dark-surface elevation — borders carry hierarchy, shadows stay soft.
        'overlay': '0 24px 64px -16px rgb(0 0 0 / 0.55), 0 4px 16px -4px rgb(0 0 0 / 0.4)',
        'panel':   '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 8px 32px -12px rgb(0 0 0 / 0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in':    'fade-in 0.25s ease both',
        'scale-in':   'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
