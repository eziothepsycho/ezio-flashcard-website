import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, radius, spacing } from "../theme/tokens";

// The website's inline radio: a dot, a label and optional explanation. Shared by
// the study settings and the quiz setup.
export default function RadioOption({ label, detail, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]} />
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {Boolean(detail) && <Text style={styles.detail}>{detail}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.base,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[3],
    padding: spacing[3],
  },
  optionSelected: {
    borderColor: colors.accent,
  },
  radio: {
    borderColor: colors.borderStrong,
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
  radioSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  text: {
    flex: 1,
    gap: spacing[1],
  },
  label: {
    color: colors.ink,
    fontSize: fontSize.md,
  },
  detail: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
});
