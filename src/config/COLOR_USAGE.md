# Centralized Color System

This project uses a centralized color configuration to ensure consistency and easy maintenance across all components.

## File Structure

- `src/config/colors.ts` - Main color configuration file
- `src/hooks/useColors.ts` - React hooks for accessing colors in components
- `src/styles/colors.css` - CSS utility classes using color variables
- `tailwind.config.js` - Tailwind configuration using centralized colors

## Usage

### 1. In React Components (TypeScript)

```tsx
import { useColors, useAccentColors } from '../hooks/useColors';

const MyComponent = () => {
  const colors = useColors();
  const accent = useAccentColors();

  return (
    <div style={{ color: accent.default }}>
      <button style={{ background: colors.cta.gradient }}>
        Click me
      </button>
    </div>
  );
};
```

### 2. Using Tailwind Classes

The system automatically provides Tailwind classes:

```tsx
<div className="text-accent bg-cta-light border-accent">
  Content with centralized colors
</div>
```

### 3. Using CSS Variables

Direct CSS variable usage:

```css
.my-element {
  color: var(--color-accent-default);
  background: var(--color-cta-gradient);
}
```

### 4. Using CSS Utility Classes

Pre-defined utility classes:

```tsx
<div className="text-accent bg-cta-gradient border-accent">
  Styled with utility classes
</div>
```

## Color Categories

### CTA (Call-to-Action)
- `cta.light` - Neon cyan (#00FFFF)
- `cta.default` - Neon green (#00FF00)
- `cta.gradient` - Neon gradient

### Accent
- `accent.default` - Primary blue (#01b7eb)
- `accent.hover` - Hover blue (#0299cc)
- `accent.light` - Light blue background (#e6f7ff)

### Highlight
- `highlight.purple` - Purple (#9540fc)
- `highlight.white` - White (#FFFFFF)
- `highlight.gradient` - Purple to white gradient

### Heading
- `heading.h2` - H2 purple (#7911ff)

### Text
- `text.primary` - Primary text (#134E4A)
- `text.secondary` - Secondary text (#6B7280)
- `text.black` - Black text (#000000)
- `text.white` - White text (#FFFFFF)

### Background
- `background.primary` - White (#FFFFFF)
- `background.secondary` - Light gray (#F9FAFB)
- `background.muted` - Muted gray (#F3F4F6)

### Border
- `border.default` - Default border (#D1D5DB)
- `border.light` - Light border (#E5E7EB)
- `border.accent` - Accent border (#01b7eb)

### Status
- `status.success` - Success green (#10B981)
- `status.error` - Error red (#EF4444)
- `status.warning` - Warning yellow (#F59E0B)
- `status.info` - Info blue (#3B82F6)

## Updating Colors

To change colors across the entire application:

1. Update `src/config/colors.ts`
2. Update CSS variables in `src/tailwind.css` if needed
3. Colors will automatically update throughout the application

## Benefits

- **Single source of truth** for all colors
- **Easy theme changes** by updating one file
- **Type safety** with TypeScript
- **Consistent naming** across components
- **CSS variable support** for dynamic theming
- **Tailwind integration** for utility classes