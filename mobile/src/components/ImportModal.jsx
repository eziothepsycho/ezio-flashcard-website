import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

// The parser is the website's own module, imported rather than copied, so both
// clients accept exactly the same pasted rows.
import { parseFlashcardImport } from "../../../shared/parseFlashcardImport.js";
import { capImportRows, MAX_BULK_CARDS } from "../lib/api/flashcardApi.js";
import { describeError } from "../lib/api/client.js";
import { colors, fontSize, radius, spacing } from "../theme/tokens";
import Button from "./Button";
import Field from "./Field";
import FormSheet from "./FormSheet";
import Notice from "./Notice";

// Paste-term-from-a-spreadsheet import: preview first, then send only the rows
// that parsed cleanly to POST /sets/{id}/cards/bulk — at most MAX_BULK_CARDS of
// them, because that is the API's own limit.
export default function ImportModal({ onCancel, onImport }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const parsed = useMemo(() => parseFlashcardImport(raw), [raw]);
  const capped = useMemo(() => capImportRows(parsed.valid), [parsed.valid]);
  const ready = parsed.valid.length;
  const rejected = parsed.invalid.length;
  const overLimit = capped.dropped > 0;

  async function handleImport() {
    if (busy || ready === 0) return;
    setError("");
    setBusy(true);
    try {
      await onImport(capped.send);
    } catch (err) {
      setError(describeError(err, "import"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormSheet
      onClose={busy ? () => {} : onCancel}
      title="Import flashcards"
      footer={
        <>
          {Boolean(error) && <Notice>{error}</Notice>}
          <Button
            busy={busy}
            disabled={ready === 0}
            onPress={handleImport}
            title={
              ready === 0
                ? "Nothing to import"
                : `Import ${capped.send.length} ${capped.send.length === 1 ? "card" : "cards"}`
            }
          />
          <Button disabled={busy} onPress={onCancel} title="Cancel" variant="ghost" />
        </>
      }
    >
      <Field
        autoCapitalize="sentences"
        label="Paste rows (term, TAB, definition)"
        multiline
        onChangeText={setRaw}
        placeholder={"Router\tForwards packets between networks\nDNS\tResolves names to addresses"}
        value={raw}
      />

      <View style={styles.summary}>
        <Text style={styles.ready}>{ready} ready</Text>
        <Text style={styles.rejected}>{rejected} rejected</Text>
      </View>

      {overLimit && (
        <Notice tone="info">
          {`The API takes at most ${MAX_BULK_CARDS} cards per import, so only the first ${capped.send.length} of these ${ready} ready rows will be sent — paste the remaining ${capped.dropped} in a second batch.`}
        </Notice>
      )}

      {parsed.invalid.slice(0, 5).map((row) => (
        <View key={`${row.lineNumber}-${row.text}`} style={styles.problem}>
          <Text style={styles.problemLine}>Line {row.lineNumber}</Text>
          <Text style={styles.problemReason}>{row.reason}</Text>
          <Text style={styles.problemText}>{row.text}</Text>
        </View>
      ))}

      {rejected > 5 && <Text style={styles.more}>…and {rejected - 5} more</Text>}

      {ready > 0 && rejected === 0 && (
        <Text style={styles.hint}>Everything parsed. Only these rows will be sent.</Text>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    gap: spacing[4],
  },
  ready: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
  rejected: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
  problem: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.base,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  problemLine: {
    color: colors.inkSecondary,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  problemReason: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
  problemText: {
    color: colors.inkFaint,
    fontSize: fontSize.sm,
  },
  more: {
    color: colors.inkFaint,
    fontSize: fontSize.sm,
  },
  hint: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
  },
});
