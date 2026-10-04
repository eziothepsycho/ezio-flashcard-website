import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";

// The sheet the set / card / import forms share: a dark overlay, a scrollable
// body and a footer for the buttons. The website's modals fill this role.
export default function FormSheet({ title, onClose, children, footer }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.close}
            >
              <Text style={styles.closeLabel}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    maxHeight: "88%",
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing[4],
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  close: {
    paddingHorizontal: spacing[2],
  },
  closeLabel: {
    color: colors.inkSecondary,
    fontSize: fontSize.xl,
    lineHeight: 28,
  },
  body: {
    gap: spacing[4],
    padding: spacing[4],
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[2],
    padding: spacing[4],
  },
});
