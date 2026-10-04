import { StyleSheet, Text } from "react-native";

import { colors, fontSize, radius, spacing } from "../theme/tokens";

// The website's .app-notice / .app-notice-error: one line the screen can show
// for a failure (or a piece of information) without touching the layout.
export default function Notice({ children, tone = "error" }) {
  if (!children) return null;

  return (
    <Text accessibilityRole="alert" style={[styles.base, tone === "error" ? styles.error : styles.info]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.base,
    borderWidth: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  error: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    color: colors.danger,
  },
  info: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    color: colors.inkSecondary,
  },
});
