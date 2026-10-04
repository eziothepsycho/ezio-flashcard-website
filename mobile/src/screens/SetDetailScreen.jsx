import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { describeError } from "../lib/api/client.js";
import Button from "../components/Button";
import CardFormModal from "../components/CardFormModal";
import CardRow from "../components/CardRow";
import ImportModal from "../components/ImportModal";
import Notice from "../components/Notice";
import Screen from "../components/Screen";
import SyncStatus from "../components/SyncStatus";
import { useSession } from "../lib/auth/session.js";
import { useCards } from "../lib/data/useCards.js";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";

// One set's cards. The set itself arrives as a route param (GET /sets is the
// only list the API offers), and everything else is re-read after each write so
// the screen never shows a guess.
export default function SetDetailScreen({ route, navigation }) {
  const { set } = route.params;
  const { user } = useSession();
  const {
    cards,
    loading,
    error,
    gone,
    notice,
    refresh,
    createCard,
    createCards,
    updateCard,
    deleteCard,
  } = useCards(set.id, user?.id ?? null);

  const [formState, setFormState] = useState(null); // null | { mode: "create" } | { mode: "edit", card }
  const [importOpen, setImportOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  // Loaded on mount and refreshed whenever the screen comes back into view, so a
  // change made on the website (or in a modal here) is reflected.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function handleCreateCard(values) {
    setActionError("");
    await createCard(values); // a failure belongs to the modal, which shows it
    setFormState(null);
  }

  async function handleEditCard(values) {
    setActionError("");
    await updateCard(formState.card.id, values);
    setFormState(null);
  }

  async function handleImport(rows) {
    setActionError("");
    await createCards(rows);
    setImportOpen(false);
  }

  function confirmDeleteCard(card) {
    Alert.alert("Delete this flashcard?", `"${card.term}" will be removed from this set.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCard(card.id);
          } catch (err) {
            if (err?.status !== 401) setActionError(describeError(err, "flashcard"));
          }
        },
      },
    ]);
  }

  const count = cards.length;

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <Button onPress={() => navigation.goBack()} size="small" title="← Back to sets" variant="ghost" />

      <View style={styles.header}>
        <Text style={styles.title}>{set.title}</Text>
        <Text style={styles.count}>
          {loading && count === 0
            ? "Loading flashcards…"
            : `${count} ${count === 1 ? "flashcard" : "flashcards"}`}
        </Text>
      </View>

      <SyncStatus />

      <Notice>{actionError}</Notice>
      <Notice>{notice}</Notice>

      {gone ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>This set is not available</Text>
          <Text style={styles.panelText}>
            It may have been deleted on another device, or it belongs to another account. The
            API answers not-found rather than forbidden, so there is nothing more to show.
          </Text>
          <Button onPress={() => navigation.goBack()} title="Back to sets" variant="ghost" />
        </View>
      ) : (
        <>
          <View style={styles.actions}>
            <Button
              disabled={cards.length === 0}
              onPress={() => navigation.navigate("Study", { set })}
              title="Study"
            />
            <Button
              disabled={cards.length === 0}
              onPress={() => navigation.navigate("Quiz", { set })}
              title="Quiz"
              variant="ghost"
            />
          </View>

          <View style={styles.actions}>
            <Button
              onPress={() => setFormState({ mode: "create" })}
              size="small"
              title="Add card"
              variant="ghost"
            />
            <Button
              onPress={() => setImportOpen(true)}
              size="small"
              title="Import"
              variant="ghost"
            />
          </View>

          <Notice>{error}</Notice>

          {!loading && count === 0 && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>No flashcards yet</Text>
              <Text style={styles.panelText}>Add one, or paste a list and import them in bulk.</Text>
            </View>
          )}

          {cards.map((card) => (
            <CardRow
              card={card}
              key={card.id}
              onDelete={() => confirmDeleteCard(card)}
              onEdit={() => setFormState({ mode: "edit", card })}
            />
          ))}
        </>
      )}

      {formState && (
        <CardFormModal
          initialCard={formState.mode === "edit" ? formState.card : null}
          mode={formState.mode}
          onCancel={() => setFormState(null)}
          onSubmit={formState.mode === "edit" ? handleEditCard : handleCreateCard}
        />
      )}

      {importOpen && (
        <ImportModal onCancel={() => setImportOpen(false)} onImport={handleImport} />
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
  count: {
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
    gap: spacing[2],
    padding: spacing[4],
  },
  panelTitle: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  panelText: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
