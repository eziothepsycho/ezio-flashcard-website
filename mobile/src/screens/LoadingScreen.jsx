import { StyleSheet, Text } from "react-native";

import Screen from "../components/Screen";
import { colors, fontSize, fontWeight } from "../theme/tokens";

// Shown while the stored token is checked against /me, so the login screen
// never flashes for somebody who is already signed in.
export default function LoadingScreen() {
  return (
    <Screen centered>
      <Text style={styles.wordmark}>cards.</Text>
      <Text style={styles.tagline}>Restoring your session…</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    color: colors.ink,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
  },
  tagline: {
    color: colors.inkSecondary,
    fontSize: fontSize.md,
  },
});
