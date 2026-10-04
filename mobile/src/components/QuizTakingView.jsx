import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";

// How long a picked answer stays highlighted before the quiz moves on, exactly
// as the website does it.
const ADVANCE_DELAY_MS = 300;

// One question at a time: pick an answer, it highlights briefly, then the next
// question (or the results) follows. The questions arrive frozen from QuizScreen,
// so nothing can shuffle them mid-quiz.
export default function QuizTakingView({ questions, onComplete }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const timer = useRef(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  // Drop a pending advance if the quiz is left mid-transition.
  useEffect(() => () => clearTimeout(timer.current), []);

  function handleSelect(optionId) {
    // Ignore repeat taps while the chosen answer is showing.
    if (selected !== null) return;

    setSelected(optionId);

    timer.current = setTimeout(() => {
      const updated = [...answers, { question, selectedOptionId: optionId }];

      if (isLast) {
        onComplete(updated);
        return;
      }

      setAnswers(updated);
      setSelected(null);
      setIndex(index + 1);
    }, ADVANCE_DELAY_MS);
  }

  return (
    <>
      <Text style={styles.progress}>
        Question {index + 1} of {questions.length}
      </Text>
      <Text style={styles.prompt}>{question.prompt}</Text>

      {question.options.map((option) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selected === option.id }}
          key={option.id}
          onPress={() => handleSelect(option.id)}
          style={[styles.choice, selected === option.id && styles.choiceSelected]}
        >
          <Text style={styles.letter}>{option.id}</Text>
          <Text style={styles.choiceText}>{option.text}</Text>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  progress: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
  prompt: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
  },
  choice: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.base,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[3],
    padding: spacing[4],
  },
  choiceSelected: {
    borderColor: colors.accent,
  },
  letter: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    width: 18,
  },
  choiceText: {
    color: colors.ink,
    flex: 1,
    fontSize: fontSize.md,
  },
});
