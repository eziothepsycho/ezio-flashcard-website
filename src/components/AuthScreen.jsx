import { useState } from "react";
import { validateLogin, validateRegistration } from "../data/auth";
import "./SetFormModal.css";
import "./AuthScreen.css";

// A password input with its own Show / Hide control, so the password and its
// confirmation can be compared while typing. Passwords stay masked by default;
// the control sits beside the input rather than inside the <label> so clicking
// it never counts as clicking the field. An `error` from the form is shown
// directly underneath.
function PasswordField({ id, label, value, onChange, autoComplete, error }) {
  const [visible, setVisible] = useState(false);
  const action = visible ? "Hide" : "Show";
  const description = `${action} ${label.toLowerCase()}`;
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          type="button"
          className="btn-text password-toggle"
          onClick={() => setVisible((isVisible) => !isVisible)}
          aria-pressed={visible}
          aria-label={description}
          title={description}
        >
          {action}
        </button>
      </div>
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

// Login and create-account on one screen. There's no router in this
// app, so the mode is just local state — the same trick SetDetail uses
// to move between its screens.
function AuthScreen({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegistering = mode === "register";

  function switchMode(nextMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setUsernameError("");
    setPasswordError("");
    setError("");
  }

  // A field stops complaining the moment it is edited, and any message from
  // the last attempt goes with it.
  function handleUsernameChange(value) {
    setUsername(value);
    if (usernameError) setUsernameError("");
    if (error) setError("");
  }

  function handlePasswordChange(value) {
    setPassword(value);
    if (passwordError) setPasswordError("");
    if (error) setError("");
  }

  function handleConfirmPasswordChange(value) {
    setConfirmPassword(value);
    if (error) setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;

    // The account layer validates too, but checking here means an empty
    // form never reaches the login (or register) code at all.
    if (isRegistering) {
      const invalid = validateRegistration({
        username,
        password,
        confirmPassword,
      });
      if (invalid) {
        setError(invalid);
        return;
      }
    } else {
      const fieldErrors = validateLogin({ username, password });
      setUsernameError(fieldErrors.username);
      setPasswordError(fieldErrors.password);
      // Something is missing: stop before anything is hashed or stored.
      if (fieldErrors.username || fieldErrors.password) return;
    }

    setError("");
    setBusy(true);
    try {
      const result = isRegistering
        ? await onRegister(username, password)
        : await onLogin(username, password);
      if (!result.ok) setError(result.error);
    } catch (err) {
      console.error("Sign-in failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="wordmark">cards.</h1>
        <p className="tagline">Your flashcard sets, studied your way.</p>

        <h2>{isRegistering ? "Create account" : "Login"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              autoComplete="username"
              autoFocus
              aria-invalid={usernameError ? "true" : undefined}
              aria-describedby={usernameError ? "username-error" : undefined}
            />
            {usernameError && (
              <p className="field-error" id="username-error">
                {usernameError}
              </p>
            )}
          </div>
          {/* Keyed on the mode so switching screens hides a revealed password */}
          <PasswordField
            key={`password-${mode}`}
            id="password"
            label="Password"
            value={password}
            onChange={handlePasswordChange}
            autoComplete={isRegistering ? "new-password" : "current-password"}
            error={passwordError}
          />
          {isRegistering && (
            <PasswordField
              key={`confirm-${mode}`}
              id="confirmPassword"
              label="Confirm password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              autoComplete="new-password"
            />
          )}

          {error && (
            <p className="field-error" id="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={busy}
          >
            {busy ? "Please wait..." : isRegistering ? "Create account" : "Login"}
          </button>
        </form>

        <div className="auth-switch">
          <span className="auth-switch-note">
            {isRegistering
              ? "Already have an account?"
              : "Don't have an account?"}
          </span>
          <button
            type="button"
            className="btn-text"
            onClick={() => switchMode(isRegistering ? "login" : "register")}
          >
            {isRegistering ? "Login" : "Create account"}
          </button>
        </div>

        <p className="auth-footnote">
          An account is just a username and a password — no email or profile.
          Both are stored in this browser only, so use a password you don't
          use anywhere else.
        </p>
      </div>
    </div>
  );
}

export default AuthScreen;