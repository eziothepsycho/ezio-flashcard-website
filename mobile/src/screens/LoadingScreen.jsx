import { StyleSheet, Text } from "react-native";

import Logo from "../components/Logo";
import Screen from "../components/Screen";
import { colors, fontSize } from "../theme/tokens";

// Shown while the stored token is checked against /me, so the login screen
// never flashes for somebody who is already signed in.
export default function LoadingScreen() {
  return (
    <Screen centered>
      <Logo />
      <Text style={styles.tagline}>Restoring your session…</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tagline: {
    color: colors.inkSecondary,
    fontSize: fontSize.md,
  },
});
