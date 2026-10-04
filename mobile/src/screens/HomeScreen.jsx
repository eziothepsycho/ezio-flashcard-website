import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { describeError } from "../lib/api/client.js";
import Button from "../components/Button";
import Notice from "../components/Notice";
import Screen from "../components/Screen";
import SetCard from "../components/SetCard";
import SetFormModal from "../components/SetFormModal";
import SyncStatus from "../components/SyncStatus";
import { useSession } from "../lib/auth/session.js";
import { useSets } from "../lib/data/useSets.js";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme/tokens";

// The signed-in home: the account's sets, straight from GET /sets. This screen
// owns the only copy of the list, so a set created, renamed or deleted anywhere
// is followed by one re-read rather than a local guess.
export default function HomeScreen({ navigation }) {
  const { user, logout } = useSession();
  const userId = user?.id ?? null;
  const { sets, loading, error, refresh, createSet, updateSet, deleteSet } = useSets(userId);

  const [formState, setFormState] = useState(null); // null | { mode: "create" } | { mode: "edit", set }
  const [actionError, setActionError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // On mount, and every time the screen comes back into view — returning from a
  // set whose cards changed must show the new card count.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function handleCreateSet(values) {
    setActionError("");
    await createSet(values); // a failure belongs to the modal, which shows it
    setFormState(null);
  }

  async function handleEditSet(values) {
    setActionError("");
    await updateSet(formState.set.id, values);
    setFormState(null);
  }

  function confirmDeleteSet(set) {
    Alert.alert("Delete this set?", `"${set.title}" and all of its flashcards will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSet(set.id);
          } catch (err) {
            if (err?.status !== 401) setActionError(describeError(err, "set"));
          }
        },
      },
    ]);
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Sign out failed:", err?.message);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>cards.</Text>
        <Text style={styles.account}>Signed in as {user?.username}</Text>
      </View>

      <SyncStatus />

      <View style={styles.toolbar}>
        <Text style={styles.heading}>Your sets</Text>
        <Button onPress={() => setFormState({ mode: "create" })} size="small" title="New set" />
      </View>

      <Notice>{actionError}</Notice>
      <Notice>{error}</Notice>

      {loading && sets.length === 0 ? (
        <Text style={styles.muted}>Loading your sets…</Text>
      ) : sets.length === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>No flashcard sets yet</Text>
          <Text style={styles.panelText}>
            Create one here, or make one on the website — the same account shows the same sets.
          </Text>
        </View>
      ) : (
        sets.map((set) => (
          <SetCard
            key={set.id}
            onDelete={() => confirmDeleteSet(set)}
            onEdit={() => setFormState({ mode: "edit", set })}
            onOpen={() => navigation.navigate("SetDetail", { set })}
            set={set}
          />
        ))
      )}

      <Button busy={loggingOut} onPress={handleLogout} title="Log out" variant="ghost" />

      {formState && (
        <SetFormModal
          initialSet={formState.mode === "edit" ? formState.set : null}
          mode={formState.mode}
          onCancel={() => setFormState(null)}
          onSubmit={formState.mode === "edit" ? handleEditSet : handleCreateSet}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing[1],
  },
  wordmark: {
    color: colors.ink,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
  },
  account: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heading: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  muted: {
    color: colors.inkSecondary,
    fontSize: fontSize.md,
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
