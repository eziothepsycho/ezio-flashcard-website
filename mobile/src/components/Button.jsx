import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";

// The website's .btn / .btn-primary / .btn-text in React Native form.
export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "regular",
  busy = false,
  disabled = false,
}) {
  const blocked = busy || disabled;
  const isPrimary = variant === "primary";
  const isSmall = size === "small";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: blocked }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isSmall && styles.small,
        isPrimary ? styles.primary : styles.ghost,
        blocked && styles.blocked,
        pressed && !blocked && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={isPrimary ? colors.accentInk : colors.ink} />
      ) : (
        <Text
          style={[
            styles.label,
            isSmall && styles.labelSmall,
            isPrimary ? styles.labelPrimary : styles.labelGhost,
            disabled && !busy && styles.labelBlocked,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.base,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing[4],
  },
  small: {
    minHeight: 38,
    paddingHorizontal: spacing[3],
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: colors.borderStrong,
  },
  blocked: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  labelSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
  },
  labelPrimary: {
    color: colors.accentInk,
  },
  labelGhost: {
    color: colors.ink,
  },
  labelBlocked: {
    color: colors.inkFaint,
  },
});
