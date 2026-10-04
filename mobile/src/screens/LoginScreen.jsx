import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { validateLogin } from "../../../shared/validation.js";
import Button from "../components/Button";
import Field from "../components/Field";
import Logo from "../components/Logo";
import Notice from "../components/Notice";
import Screen from "../components/Screen";
import { useSession } from "../lib/auth/session.js";
import { colors, fontSize, spacing } from "../theme/tokens";

export default function LoginScreen({ navigation }) {
  const { login, notice } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ username: "", password: "" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy) return;
    setFormError("");

    // The website's own rules, from shared/validation.js: one message per field,
    // and no hint about which half of a wrong pair was wrong.
    const invalid = validateLogin({ username, password });
    setFieldErrors(invalid);
    if (invalid.username || invalid.password) return;

    setBusy(true);
    try {
      // On success the session holds the user and the navigator switches to the
      // signed-in stack by itself.
      await login(username, password);
    } catch (err) {
      setFieldErrors({
        username: err?.fields?.username ?? "",
        password: err?.fields?.password ?? "",
      });
      setFormError(err?.message ?? "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen centered>
      <Logo />
      <Text style={styles.tagline}>Sign in to the same account as the website.</Text>

      {/* Why you are looking at this screen at all: only a session that expired
          or was rejected lands here with an explanation. Offline is not one. */}
      <Notice>{notice}</Notice>

      <Field
        autoComplete="username"
        error={fieldErrors.username}
        label="Username"
        onChangeText={setUsername}
        value={username}
      />
      <Field
        autoComplete="current-password"
        error={fieldErrors.password}
        label="Password"
        onChangeText={setPassword}
        secure
        value={password}
      />

      {Boolean(formError) && <Text style={styles.formError}>{formError}</Text>}

      <Button busy={busy} onPress={handleSubmit} title="Log in" />
      <Button
        onPress={() => navigation.navigate("Register")}
        title="Create an account"
        variant="ghost"
      />
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
