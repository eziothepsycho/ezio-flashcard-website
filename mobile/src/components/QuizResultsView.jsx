import { StyleSheet, Text, View } from "react-native";

import { summariseQuiz } from "../lib/data/quizResults.js";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";
import Button from "./Button";

// The website's results screen, mirroring it exactly: the score, then "Review
// answers" split into two separate sections — the questions answered incorrectly
// (with the right answer) and those answered correctly (without it). The two are
// never mixed into one list, and an empty side says so.
export default function QuizResultsView({ answers, onTryAgain, onBack }) {
  const { score, correct, incorrect } = summariseQuiz(answers);

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Quiz complete</Text>
        <Text style={styles.score}>{score}% correct</Text>
        <Text style={styles.scoreText}>
          You answered {correct.length} of {answers.length} questions correctly.
        </Text>
        <Text style={styles.counts}>
          {correct.length} correct · {incorrect.length} incorrect
        </Text>
        <Button onPress={onTryAgain} title="Try another quiz" />
        <Button onPress={onBack} title="Back to the set" variant="ghost" />
      </View>

      <Text style={styles.heading}>Review answers</Text>

      <Text style={styles.group}>Incorrect</Text>
      {incorrect.length === 0 ? (
        <Text style={styles.empty}>No incorrect answers.</Text>
      ) : (
        incorrect.map((entry) => (
          <ReviewRow entry={entry} key={entry.question.cardId} showCorrectAnswer />
        ))
      )}

      <Text style={styles.group}>Correct</Text>
      {correct.length === 0 ? (
        <Text style={styles.empty}>No correct answers.</Text>
      ) : (
        correct.map((entry) => <ReviewRow entry={entry} key={entry.question.cardId} />)
      )}
    </>
  );
}

function ReviewRow({ entry, showCorrectAnswer = false }) {
  const selected = entry.question.options.find((option) => option.id === entry.selectedOptionId);
  const correctOption = entry.question.options.find(
    (option) => option.id === entry.question.correctOptionId
  );

  return (
    <View style={[styles.row, entry.isCorrect ? styles.rowCorrect : styles.rowWrong]}>
      <Text style={styles.question}>
        {entry.number}. {entry.question.prompt}
      </Text>

      <Text style={styles.answerLabel}>Your answer</Text>
      <Text style={[styles.answer, !entry.isCorrect && styles.answerWrong]}>{selected?.text}</Text>

      {showCorrectAnswer && (
        <>
          <Text style={styles.answerLabel}>Correct answer</Text>
          <Text style={styles.answer}>{correctOption?.text}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[5],
    width: "100%",
  },
  eyebrow: {
    color: colors.inkSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  score: {
    color: colors.accent,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
  },
  scoreText: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
  counts: {
    color: colors.inkFaint,
    fontSize: fontSize.sm,
    marginBottom: spacing[2],
  },
  heading: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  group: {
    color: colors.inkSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  empty: {
    color: colors.inkFaint,
    fontSize: fontSize.sm,
  },
  row: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.base,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[4],
  },
  rowCorrect: {
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
  },
  rowWrong: {
    borderLeftColor: colors.danger,
    borderLeftWidth: 3,
  },
  question: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    marginBottom: spacing[2],
  },
  answerLabel: {
    color: colors.inkFaint,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  answer: {
    color: colors.ink,
    fontSize: fontSize.md,
  },
  answerWrong: {
    color: colors.danger,
  },
});
