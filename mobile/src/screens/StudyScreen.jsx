import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import Button from "../components/Button";
import Notice from "../components/Notice";
import Screen from "../components/Screen";
import StudyCard from "../components/StudyCard";
import StudySettingsModal from "../components/StudySettingsModal";
import { useSession } from "../lib/auth/session.js";
import { useCards } from "../lib/data/useCards.js";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";

// Study Mode, mirroring the website: browsing (flip and step through) and basic
// sorting (grade each card, saved through PATCH /cards/{id}). A session always
// ends on a summary — there is deliberately no auto-loop.
//
// Fullscreen is the one website feature left out: React Native has no equivalent
// of the browser's Fullscreen API.
function learningCounts(cards) {
  return {
    known: cards.filter((card) => card.learningStatus === "known").length,
    learning: cards.filter((card) => card.learningStatus === "learning").length,
  };
}

export default function StudyScreen({ route, navigation }) {
  const { set } = route.params;
  const { user } = useSession();
  const { cards, loading, error, gone, notice, gradeCard, refresh } = useCards(
    set.id,
    user?.id ?? null
  );

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState("term");
  const [sorting, setSorting] = useState("browsing");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionIds, setSessionIds] = useState(null); // null means every loaded card
  const [sessionType, setSessionType] = useState("all"); // "all" | "review"
  const [stage, setStage] = useState("session"); // "session" | "complete" | "nothing-to-review"

  // Loaded once when the screen opens. Deliberately not refreshed during a
  // session: grading never removes a card, so the session list stays stable and
  // never waits on the network.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const sessionCards =
    sessionIds === null
      ? cards
      : sessionIds.map((id) => cards.find((item) => item.id === id)).filter(Boolean);
  const card = sessionCards[index];
  const isFirst = index === 0;
  const isLast = index === sessionCards.length - 1;
  const counts = learningCounts(cards);

  function goTo(nextIndex) {
    setIndex(nextIndex);
    setFlipped(false);
  }

  function grade(learningStatus) {
    if (!card) return;

    // Shows immediately, written in the background — a study session never waits.
    gradeCard(card.id, learningStatus);

    if (isLast) setStage("complete");
    else goTo(index + 1);
  }

  function restartAll() {
    setSessionIds(null);
    setSessionType("all");
    setIndex(0);
    setFlipped(false);
    setStage("session");
  }

  // The focused round: only the cards still marked "learning".
  function beginReview() {
    const ids = cards
      .filter((item) => item.learningStatus === "learning")
      .map((item) => item.id);

    if (ids.length === 0) {
      setStage("nothing-to-review");
      return;
    }

    setSessionIds(ids);
    setSessionType("review");
    setIndex(0);
    setFlipped(false);
    setStage("session");
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

  return (
    <Screen>
      <Button onPress={() => navigation.goBack()} size="small" title="← Exit study" variant="ghost" />

      <View style={styles.header}>
        <Text style={styles.title}>{set.title}</Text>
        <Text style={styles.progress}>
          {stage === "session" && sessionCards.length > 0
            ? `Card ${index + 1} of ${sessionCards.length}`
            : `${counts.known} known · ${counts.learning} still learning`}
        </Text>
      </View>

      <Notice>{notice}</Notice>
      <Notice>{error}</Notice>

      {loading && sessionCards.length === 0 && (
        <Text style={styles.progress}>Loading flashcards…</Text>
      )}

      {!loading && sessionCards.length === 0 && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Nothing to study</Text>
          <Text style={styles.panelText}>This set has no flashcards yet.</Text>
        </View>
      )}

      {stage === "nothing-to-review" && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Nothing to review</Text>
          <Text style={styles.panelText}>
            Every card in this set is marked as known. Restart all cards to go through them again.
          </Text>
          <Button onPress={restartAll} title="Restart all cards" />
        </View>
      )}

      {stage === "complete" && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {sessionType === "review" ? "Review complete" : "Session complete"}
          </Text>
          <Text style={styles.panelText}>
            {counts.known} known · {counts.learning} still learning
          </Text>
          {sessionType === "all" && counts.learning > 0 && (
            <Button onPress={beginReview} title="Study cards I don't know" />
          )}
          <Button onPress={restartAll} title="Restart all cards" variant="ghost" />
          <Button onPress={() => navigation.goBack()} title="Back to the set" variant="ghost" />
        </View>
      )}

      {stage === "session" && card && (
        <>
          {sessionType === "review" && (
            <Text style={styles.progress}>Reviewing only the cards you don't know yet</Text>
          )}

          <StudyCard
            card={card}
            flipped={flipped}
            front={front}
            onFlip={() => setFlipped((current) => !current)}
          />

          {sorting === "basic" ? (
            <View style={styles.actions}>
              <Button onPress={() => grade("learning")} title="I don't know this" variant="ghost" />
              <Button onPress={() => grade("known")} title="I know this" />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button
                disabled={isFirst}
                onPress={() => goTo(index - 1)}
                title="Previous"
                variant="ghost"
              />
              <Button
                onPress={() => (isLast ? setStage("complete") : goTo(index + 1))}
                title={isLast ? "Finish" : "Next"}
              />
            </View>
          )}

          <Button onPress={() => setSettingsOpen(true)} title="Settings" variant="ghost" />
        </>
      )}

      {settingsOpen && (
        <StudySettingsModal
          front={front}
          onApply={({ sorting: nextSorting, front: nextFront }) => {
            setSorting(nextSorting);
            setFront(nextFront);
            setSettingsOpen(false);
            setFlipped(false);
          }}
          onCancel={() => setSettingsOpen(false)}
          sorting={sorting}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing[1],
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  progress: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing[2],
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
