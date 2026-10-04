// The website's design tokens (src/index.css) expressed as plain values, so the
// app can look like the site without carrying any CSS across. Dependency-free on
// purpose: nothing here imports React, React Native or a browser API.
//
// Keys mirror the CSS variables one-for-one — colors.accent is --color-accent,
// spacing[4] is --space-4 — so a value only ever has to be changed in one place
// mentally: copy it from src/index.css when it moves.
//
// The display/body fonts (Fraunces and Inter) are recorded as intent only. React
// Native has no CSS font stacks, so the real font files are loaded with
// expo-font in a later phase; until then screens use the platform's system font.

export const colors = {
  bg: "#161817",
  surface: "#1e211f",
  surfaceRaised: "#272b28",
  border: "#393e3a",
  borderStrong: "#555c56",
  ink: "#f1f3ee",
  inkSecondary: "#b2b8b0",
  inkFaint: "#7b837b",
  accent: "#c9f26b",
  accentInk: "#19200e",
  accentMuted: "#303b20",
  danger: "#d99a92",
  dangerBg: "#362524",
};

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
};

export const radius = {
  base: 10,
  lg: 16,
};

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 48,
};

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
};

// Names only, so a screen written later can ask for the right family once the
// fonts are installed. Do not pass these to `fontFamily` yet — React Native
// needs real font names, not CSS stacks.
export const fontFamilyIntent = {
  display: "Fraunces",
  body: "Inter",
};
