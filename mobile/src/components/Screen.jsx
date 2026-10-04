import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "../theme/tokens";

// The page shell every screen shares: dark background, safe areas respected,
// and a scroll view so a small phone with the keyboard up can still reach the
// button at the bottom. Passing onRefresh adds pull-to-refresh.
export default function Screen({ children, centered = false, refreshing = false, onRefresh }) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.content, centered && styles.centered]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              colors={[colors.accent]}
              onRefresh={onRefresh}
              refreshing={refreshing}
              tintColor={colors.inkSecondary}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    gap: spacing[4],
    padding: spacing[5],
  },
  centered: {
    flexGrow: 1,
    justifyContent: "center",
  },
});
