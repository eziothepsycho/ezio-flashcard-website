import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";

// One flashcard: tap to flip between the question side and the answer side.
// `front` decides which field is asked, matching the website's "Front of card"
// setting. The website animates this in CSS; here the side simply changes.
export default function StudyCard({ card, front, flipped, onFlip }) {
  const question = front === "term" ? card.term : card.definition;
  const answer = front === "term" ? card.definition : card.term;

  return (
    <Pressable
      accessibilityLabel="Flip flashcard"
      accessibilityRole="button"
      onPress={onFlip}
      style={({ pressed }) => [styles.card, flipped && styles.cardBack, pressed && styles.pressed]}
    >
      <Text style={styles.side}>{flipped ? "Back" : "Front"}</Text>
      <Text style={styles.text}>{flipped ? answer : question}</Text>
      <Text style={styles.hint}>{flipped ? "Tap to see the other side" : "Tap to reveal"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing[3],
    justifyContent: "center",
    minHeight: 240,
    padding: spacing[5],
  },
  cardBack: {
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.9,
  },
  side: {
    color: colors.inkFaint,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  text: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
  },
  hint: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
});
