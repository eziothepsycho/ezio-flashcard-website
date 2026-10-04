import { Image, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, spacing } from "../theme/tokens";

// The brand mark (assets/icon.png — the same file the launcher icon is built
// from) paired with the "cards." wordmark, so the logo lives in exactly one
// place and every screen shows the same thing.
// `layout="stacked"` (the default) puts the mark above the wordmark for the
// entry screens; `layout="inline"` sits the two side by side for the home
// header.
const mark = require("../../assets/icon.png");

export default function Logo({ layout = "stacked", markSize = 64 }) {
  const inline = layout === "inline";

  return (
    <View style={[styles.base, inline ? styles.inline : styles.stacked]}>
      <Image
        accessibilityIgnoresInvertColors
        source={mark}
        style={[
          styles.mark,
          { borderRadius: Math.round(markSize * 0.22), height: markSize, width: markSize },
        ]}
      />
      <Text style={[styles.wordmark, inline && styles.wordmarkInline]}>cards.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    gap: spacing[2],
  },
  stacked: {
    alignSelf: "flex-start",
  },
  inline: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[3],
  },
  mark: {
    backgroundColor: colors.surface,
  },
  wordmark: {
    color: colors.ink,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
  },
  wordmarkInline: {
    fontSize: fontSize.xl,
  },
});
