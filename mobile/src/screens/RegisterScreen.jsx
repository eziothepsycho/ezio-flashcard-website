import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { validateRegistration } from "../../../shared/validation.js";
import Button from "../components/Button";
import Field from "../components/Field";
import Logo from "../components/Logo";
import Screen from "../components/Screen";
import { useSession } from "../lib/auth/session.js";
import { colors, fontSize, spacing } from "../theme/tokens";

export default function RegisterScreen({ navigation }) {
  const { register } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy) return;
    setUsernameError("");
    setFormError("");

    // Same rules as the website, from shared/validation.js: username length and
    // characters, password length, and the two passwords matching.
    const invalid = validateRegistration({ username, password, confirmPassword });
    if (invalid) {
      setFormError(invalid);
      return;
    }

    setBusy(true);
    try {
      // Creating an account signs you in, exactly like the website.
      await register(username, password);
    } catch (err) {
      // A taken username arrives as a per-field error; anything else as a banner
      // (a throttled registration, an unreachable API, …).
      setUsernameError(err?.fields?.username ?? "");
      setFormError(err?.message ?? "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen centered>
      <Logo />
      <Text style={styles.tagline}>
        A username and a password — nothing else is asked for.
      </Text>

      <Field
        autoComplete="username-new"
        error={usernameError}
        label="Username"
        onChangeText={setUsername}
        placeholder="3-20 letters, numbers, underscores"
        value={username}
      />
      <Field
        autoComplete="new-password"
        label="Password"
        onChangeText={setPassword}
        secure
        value={password}
      />
      <Field
        autoComplete="new-password"
        label="Confirm password"
        onChangeText={setConfirmPassword}
        secure
        value={confirmPassword}
      />

      {Boolean(formError) && <Text style={styles.formError}>{formError}</Text>}

      <Button busy={busy} onPress={handleSubmit} title="Create account" />
      <Button onPress={() => navigation.goBack()} title="Back to log in" variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tagline: {
    color: colors.inkSecondary,
    fontSize: fontSize.md,
    marginBottom: spacing[3],
    marginTop: -spacing[3],
  },
  formError: {
    color: colors.danger,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
});
