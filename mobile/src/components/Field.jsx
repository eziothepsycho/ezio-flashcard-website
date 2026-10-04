import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fontSize, radius, spacing } from "../theme/tokens";

// One text input with its label and its error message. `secure` adds the same
// Show / Hide control the website has, so a password can be checked while it is
// being typed.
export default function Field({
  label,
  value,
  onChangeText,
  error,
  secure = false,
  placeholder,
  autoComplete,
  autoCapitalize = "none",
  keyboardType,
  multiline = false,
}) {
  const [visible, setVisible] = useState(false);
  const action = visible ? "Hide" : "Show";

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputRow, Boolean(error) && styles.inputRowInvalid]}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          secureTextEntry={secure && !visible}
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
        />

        {secure && (
          <Pressable
            accessibilityLabel={`${action} ${label.toLowerCase()}`}
            accessibilityRole="button"
            onPress={() => setVisible((current) => !current)}
            style={styles.toggle}
          >
            <Text style={styles.toggleLabel}>{action}</Text>
          </Pressable>
        )}
      </View>

      {Boolean(error) && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing[2],
  },
  label: {
    color: colors.inkSecondary,
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  inputRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.base,
    borderWidth: 1,
    flexDirection: "row",
  },
  inputRowInvalid: {
    borderColor: colors.danger,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: fontSize.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  toggle: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  toggleLabel: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
});
