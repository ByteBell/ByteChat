// Centralized color configuration for ByteChat
export const COLORS = {
  // CTA colors - neon gradient
  cta: {
    light: '#00FFFF',    // neon cyan
    default: '#00FF00',  // neon green
    gradient: 'linear-gradient(135deg, #00FFFF 20%, #00FF00 100%)',
  },

  // Highlight colors - purple gradient
  highlight: {
    purple: '#9540fc',   // gradient start
    white: '#FFFFFF',    // gradient end
    gradient: 'linear-gradient(135deg, #9540fc 0%, #FFFFFF 100%)',
  },

  // Accent color - blue
  accent: {
    default: '#01b7eb',  // primary accent blue
    hover: '#0299cc',    // darker blue for hover states
    light: '#e6f7ff',    // light blue for backgrounds
  },

  // H2 color - purple
  heading: {
    h2: '#7911ff',       // H2 purple color
  },

  // Text colors
  text: {
    primary: '#134E4A',  // deep teal text
    secondary: '#6B7280', // gray text
    black: '#000000',    // black text for neon backgrounds
    white: '#FFFFFF',    // white text
  },

  // Background colors
  background: {
    primary: '#FFFFFF',  // white background
    secondary: '#F9FAFB', // light gray background
    muted: '#F3F4F6',    // muted background
  },

  // Border colors
  border: {
    default: '#D1D5DB',  // default border
    light: '#E5E7EB',    // light border
    accent: '#01b7eb',   // accent border
  },

  // Status colors
  status: {
    success: '#10B981',  // green
    error: '#EF4444',    // red
    warning: '#F59E0B',  // yellow
    info: '#3B82F6',     // blue
  },

  // Utility colors
  utility: {
    transparent: 'transparent',
    current: 'currentColor',
  }
} as const;

// Export individual color groups for easier imports
export const { cta, highlight, accent, heading, text, background, border, status, utility } = COLORS;

// Helper function to get CSS variables
export const getCSSVariables = () => {
  return {
    '--color-cta-light': COLORS.cta.light,
    '--color-cta-default': COLORS.cta.default,
    '--color-cta-gradient': COLORS.cta.gradient,
    '--color-highlight-purple': COLORS.highlight.purple,
    '--color-highlight-white': COLORS.highlight.white,
    '--color-highlight-gradient': COLORS.highlight.gradient,
    '--color-accent-default': COLORS.accent.default,
    '--color-accent-hover': COLORS.accent.hover,
    '--color-accent-light': COLORS.accent.light,
    '--color-heading-h2': COLORS.heading.h2,
    '--color-text-primary': COLORS.text.primary,
    '--color-text-secondary': COLORS.text.secondary,
    '--color-text-black': COLORS.text.black,
    '--color-text-white': COLORS.text.white,
    '--color-background-primary': COLORS.background.primary,
    '--color-background-secondary': COLORS.background.secondary,
    '--color-background-muted': COLORS.background.muted,
    '--color-border-default': COLORS.border.default,
    '--color-border-light': COLORS.border.light,
    '--color-border-accent': COLORS.border.accent,
    '--color-status-success': COLORS.status.success,
    '--color-status-error': COLORS.status.error,
    '--color-status-warning': COLORS.status.warning,
    '--color-status-info': COLORS.status.info,
  };
};

export default COLORS;