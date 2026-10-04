import { useState } from "react";
import { StyleSheet, Text } from "react-native";

// The website's own rule for the question count, from shared/.
import { validateQuestionCount } from "../../../shared/validation.js";
import { colors, fontSize, fontWeight } from "../theme/tokens";
import Button from "./Button";
import Field from "./Field";
import Notice from "./Notice";
import RadioOption from "./RadioOption";

// The ids are the keys shared/generateQuiz.js understands.
const DIRECTIONS = [
  { id: "term-to-definition", label: "Term → Definition" },
  { id: "definition-to-term", label: "Definition → Term" },
];

export default function QuizSetup({ totalCards, onBack, onStart }) {
  const [direction, setDirection] = useState(DIRECTIONS[0].id);
  // Kept as a string so the field can be empty while it is being typed.
  const [countInput, setCountInput] = useState(() => String(Math.min(10, totalCards)));
  const [error, setError] = useState("");

  function handleStart() {
    const message = validateQuestionCount(countInput, totalCards);
    setError(message ?? "");
    if (message) return;

    onStart({ count: Number(countInput.trim()), direction });
  }

  return (
    <>
      <Button onPress={onBack} size="small" title="← Back to the set" variant="ghost" />

      <Text style={styles.title}>Start a quiz</Text>
      <Text style={styles.hint}>
        This set has {totalCards} {totalCards === 1 ? "flashcard" : "flashcards"}.
      </Text>

      <Text style={styles.group}>Question direction</Text>
      {DIRECTIONS.map((option) => (
        <RadioOption
          key={option.id}
          label={option.label}
          onPress={() => setDirection(option.id)}
          selected={direction === option.id}
        />
      ))}

      <Field
        autoCapitalize="none"
        keyboardType="number-pad"
        label="How many questions?"
        onChangeText={(value) => {
          setCountInput(value);
          // Clear a stale message as soon as the number is valid again.
          if (error) setError(validateQuestionCount(value, totalCards) ?? "");
        }}
        value={countInput}
      />

      <Notice>{error}</Notice>

      <Button onPress={handleStart} title="Start quiz" />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  hint: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
  group: {
    color: colors.inkSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
