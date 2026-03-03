export const colors = {
  brand: {
    navy: "#0B1D3A",
    deep: "#162B4D",
    accent: "#3B82C4",
    gold: "#D4A853",
  },
  surface: {
    base: "#FAFAF7",
    subtle: "#F0EDE6",
    card: "#FFFFFF",
  },
  text: {
    primary: "#1A1A1A",
    secondary: "#3D3D3D",
    muted: "#9CA3AF",
    inverse: "#FFFFFF",
  },
  border: {
    soft: "#E8E5DE",
    strong: "#D6D1C7",
  },
  research: {
    cilia: "#3B82C4",
    metabolic: "#6B8E5A",
    aging: "#9B6B9E",
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans KR', 'Apple SD Gothic Neo', Arial, sans-serif",
    serif: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans KR', 'Apple SD Gothic Neo', Arial, sans-serif",
  },
  fontSize: {
    xs: "0.75rem", // 12
    sm: "0.875rem", // 14
    md: "1rem", // 16
    lg: "1.125rem", // 18
    xl: "1.5rem", // 24
    "2xl": "2rem", // 32
    "3xl": "3rem", // 48
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
    loose: 1.85,
  },
} as const;

export const spacing = {
  0: "0",
  1: "0.25rem", // 4
  2: "0.5rem", // 8
  3: "0.75rem", // 12
  4: "1rem", // 16
  5: "1.25rem", // 20
  6: "1.5rem", // 24
  8: "2rem", // 32
  10: "2.5rem", // 40
  12: "3rem", // 48
  16: "4rem", // 64
  20: "5rem", // 80
} as const;

export const radius = {
  sm: "0.375rem", // 6
  md: "0.5rem", // 8
  lg: "0.75rem", // 12
  pill: "9999px",
} as const;

export const shadow = {
  soft: "0 1px 3px rgba(0, 0, 0, 0.04)",
  cardHover: "0 12px 40px rgba(11, 29, 58, 0.10)",
} as const;

export const breakpoints = {
  mobile: 480,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
} as const;

export const zIndex = {
  header: 100,
  overlay: 200,
  modal: 300,
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadow,
  breakpoints,
  zIndex,
} as const;

export type DesignTokens = typeof tokens;
