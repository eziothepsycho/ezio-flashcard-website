import { StyleSheet, Text, View } from "react-native";

import Button from "./Button";
import { useSyncStatus } from "../lib/data/useSyncStatus.js";
import { colors, fontSize, spacing } from "../theme/tokens";

// One line that says where the app stands — up to date, syncing, waiting,
// offline, or a failed sync that can be retried — and the manual "Sync Now"
// beside it.
//
// Nothing here blocks anything: the flashcard screens keep working whatever this
// says, because every read comes from the local mirror and every write is queued.
export default function SyncStatus() {
  const { state, pending, lastSyncedAt, message, syncNow } = useSyncStatus();
  const busy = state === "syncing";
  const troubled = state === "offline" || state === "error";

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.dot, troubled && styles.dotTroubled, busy && styles.dotBusy]} />
        <Text style={[styles.label, troubled && styles.labelTroubled]}>
          {describe(state, pending, lastSyncedAt)}
        </Text>
        <Button
          busy={busy}
          disabled={busy}
          onPress={syncNow}
          size="small"
          title="Sync Now"
          variant="ghost"
        />
      </View>

      {Boolean(message) && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

function describe(state, pending, lastSyncedAt) {
  if (state === "syncing") return "Syncing…";

  if (state === "error") return "Sync failed — retry";

  if (state === "offline") {
    return pending > 0
      ? `Offline — ${plural(pending)} saved on this phone`
      : "Offline — showing what is saved on this phone";
  }

  if (pending > 0) return `${plural(pending)} waiting to sync`;

  if (lastSyncedAt) {
    return `Up to date · synced ${new Date(lastSyncedAt).toLocaleTimeString()}`;
  }

  return "Saved on this phone";
}

const plural = (pending) => `${pending} ${pending === 1 ? "change" : "changes"}`;

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[1],
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[2],
  },
  dot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotTroubled: {
    backgroundColor: colors.danger,
  },
  dotBusy: {
    backgroundColor: colors.inkFaint,
  },
  label: {
    color: colors.inkSecondary,
    flex: 1,
    fontSize: fontSize.sm,
  },
  labelTroubled: {
    color: colors.danger,
  },
  message: {
    color: colors.inkFaint,
    fontSize: fontSize.xs,
  },
});
