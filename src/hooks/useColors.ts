// React hook for accessing centralized colors
import { COLORS } from '../config/colors';

export const useColors = () => {
  return COLORS;
};

// Helper hook for getting specific color groups
export const useCtaColors = () => COLORS.cta;
export const useAccentColors = () => COLORS.accent;
export const useHighlightColors = () => COLORS.highlight;
export const useTextColors = () => COLORS.text;
export const useBackgroundColors = () => COLORS.background;
export const useBorderColors = () => COLORS.border;
export const useStatusColors = () => COLORS.status;
export const useHeadingColors = () => COLORS.heading;

export default useColors;