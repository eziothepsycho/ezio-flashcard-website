import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";
import Button from "./Button";

// One row in the sets list. `cardsCount` only arrives on the list response
// (GET /sets), so the row says "unknown" rather than pretending it is zero when
// the number is not there.
export default function SetCard({ set, onOpen, onEdit, onDelete }) {
  const count = typeof set.cardsCount === "number" ? set.cardsCount : null;
  const countLabel =
    count === null ? "Card count unknown" : `${count} ${count === 1 ? "card" : "cards"}`;

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.body}>
        <Text style={styles.title}>{set.title}</Text>
        {Boolean(set.description) && <Text style={styles.description}>{set.description}</Text>}
        <Text style={styles.count}>{countLabel}</Text>
      </Pressable>

      <View style={styles.actions}>
        <Button onPress={onEdit} size="small" title="Edit" variant="ghost" />
        <Button onPress={onDelete} size="small" title="Delete" variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[4],
  },
  body: {
    gap: spacing[1],
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  description: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
  count: {
    color: colors.inkFaint,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  actions: {
    flexDirection: "row",
    gap: spacing[2],
  },
});
