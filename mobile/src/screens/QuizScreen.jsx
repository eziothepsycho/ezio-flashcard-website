import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

// The website's own generator, from shared/ — questions are built once, when the
// quiz starts, so a later refresh cannot reshuffle them mid-quiz.
import { generateQuiz } from "../../../shared/generateQuiz.js";
import Button from "../components/Button";
import Notice from "../components/Notice";
import QuizResultsView from "../components/QuizResultsView";
import QuizSetup from "../components/QuizSetup";
import QuizTakingView from "../components/QuizTakingView";
import Screen from "../components/Screen";
import { useSession } from "../lib/auth/session.js";
import { useCards } from "../lib/data/useCards.js";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";

// One screen for the whole quiz: setup → questions → results. The cards come
// from the same hook the set screen uses, and the questions from shared logic.
export default function QuizScreen({ route, navigation }) {
  const { set } = route.params;
  const { user } = useSession();
  const { cards, loading, error, gone, refresh } = useCards(set.id, user?.id ?? null);

  const [stage, setStage] = useState("setup"); // "setup" | "taking" | "results"
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  function startQuiz({ count, direction }) {
    setQuestions(generateQuiz(cards, count, direction));
    setAnswers([]);
    setStage("taking");
  }

  function finishQuiz(collected) {
    setAnswers(collected);
    setStage("results");
  }

  if (gone) {
    return (
      <Screen centered>
        <Text style={styles.panelTitle}>This set is not available</Text>
        <Notice>It may have been deleted on another device.</Notice>
        <Button onPress={() => navigation.goBack()} title="Back to the set" variant="ghost" />
      </Screen>
    );
  }

  if (loading && cards.length === 0) {
    return (
      <Screen centered>
        <Text style={styles.hint}>Loading flashcards…</Text>
      </Screen>
    );
  }

  if (stage === "setup" && cards.length === 0) {
    return (
      <Screen>
        <Button
          onPress={() => navigation.goBack()}
          size="small"
          title="← Back to the set"
          variant="ghost"
        />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Nothing to quiz</Text>
          <Text style={styles.panelText}>This set has no flashcards yet.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Notice>{error}</Notice>

      {stage === "setup" && (
        <QuizSetup
          onBack={() => navigation.goBack()}
          onStart={startQuiz}
          totalCards={cards.length}
        />
      )}

      {stage === "taking" && <QuizTakingView onComplete={finishQuiz} questions={questions} />}

      {stage === "results" && (
        <QuizResultsView
          answers={answers}
          onBack={() => navigation.goBack()}
          onTryAgain={() => setStage("setup")}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: colors.inkSecondary,
    fontSize: fontSize.md,
  },
  panel: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[4],
  },
  panelTitle: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  panelText: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
