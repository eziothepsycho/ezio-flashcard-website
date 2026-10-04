import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";
import Button from "./Button";

// The website's learning-status badge, read-only here: grading happens in Study
// Mode (Phase H) through the same PATCH /cards/{id}.
const STATUS_LABELS = {
  known: "I know this",
  learning: "Still learning",
};

export default function CardRow({ card, onEdit, onDelete }) {
  const status = STATUS_LABELS[card.learningStatus] ?? "";

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.term}>{card.term}</Text>
        <Text style={styles.definition}>{card.definition}</Text>
        {Boolean(status) && (
          <Text style={[styles.status, card.learningStatus === "known" ? styles.known : styles.learning]}>
            {status}
          </Text>
        )}
      </View>

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
    borderRadius: radius.base,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[4],
  },
  text: {
    gap: spacing[1],
  },
  term: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  definition: {
    color: colors.inkSecondary,
    fontSize: fontSize.md,
  },
  status: {
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  known: {
    color: colors.accent,
  },
  learning: {
    color: colors.danger,
  },
  actions: {
    flexDirection: "row",
    gap: spacing[2],
  },
});
