
/** @type {import('tailwindcss').Config} */
// tailwind.config.js
const COLORS = {
  cta: {
    light: '#00FFFF',
    default: '#00FF00',
  },
  highlight: {
    purple: '#9540fc',
    white: '#FFFFFF',
  },
  accent: {
    default: '#01b7eb',
    hover: '#0299cc',
    light: '#e6f7ff',
  },
  heading: {
    h2: '#7911ff',
  },
  text: {
    primary: '#134E4A',
    secondary: '#6B7280',
    black: '#000000',
    white: '#FFFFFF',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    muted: '#F3F4F6',
  },
  border: {
    default: '#D1D5DB',
    light: '#E5E7EB',
    accent: '#01b7eb',
  },
  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  }
};

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/**/*.html',
    './manifest.json',
  ],
  theme: {
    extend: {
      colors: {
        // CTA colors - neon gradient
        cta: {
          light: COLORS.cta.light,
          DEFAULT: COLORS.cta.default,
        },
        // Highlight colors - purple gradient
        highlight: {
          purple: COLORS.highlight.purple,
          white: COLORS.highlight.white,
        },
        // Accent color - blue
        accent: {
          DEFAULT: COLORS.accent.default,
          hover: COLORS.accent.hover,
          light: COLORS.accent.light,
        },
        // H2 color - purple
        heading: {
          h2: COLORS.heading.h2,
        },
        // Text colors
        text: {
          DEFAULT: COLORS.text.primary,
          secondary: COLORS.text.secondary,
          black: COLORS.text.black,
          white: COLORS.text.white,
        },
        // Background colors
        background: {
          primary: COLORS.background.primary,
          secondary: COLORS.background.secondary,
          muted: COLORS.background.muted,
        },
        // Border colors
        border: {
          DEFAULT: COLORS.border.default,
          light: COLORS.border.light,
          accent: COLORS.border.accent,
        },
        // Status colors
        status: {
          success: COLORS.status.success,
          error: COLORS.status.error,
          warning: COLORS.status.warning,
          info: COLORS.status.info,
        }
      }
    }
  },
  plugins: [],
}
