// Shared pure logic (shared/): no React, no DOM, no localStorage, no network.
// Both clients validate with these, so a rule or a message can only ever change
// in one place. The website reaches them through data/auth.js (which re-exports
// them) and through QuizSetup.jsx; the mobile app imports them directly.

// ---------- Accounts ----------

// The limits the messages below are built from. Kept private: callers only
// ever need the messages, so there is nothing to keep in sync at the call site.
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const MIN_PASSWORD_LENGTH = 4;

export function validateUsername(username) {
  const trimmed = username.trim();
  if (!trimmed) return "Enter a username.";
  if (
    trimmed.length < MIN_USERNAME_LENGTH ||
    trimmed.length > MAX_USERNAME_LENGTH
  ) {
    return `Usernames need to be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Usernames can only use letters, numbers and underscores.";
  }
  return "";
}

export function validatePassword(password) {
  if (!password) return "Enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords need to be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return "";
}

export function validateRegistration({ username, password, confirmPassword }) {
  const usernameError = validateUsername(username);
  if (usernameError) return usernameError;
  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;
  if (password !== confirmPassword) return "Passwords don't match.";
  return "";
}

// Login only asks that both fields are filled in. The register rules
// (length, allowed characters) deliberately don't apply here — they would
// lock out an account created under older rules — and anything more
// specific would hint at which half of the credentials was wrong.
//
// Returns one message per field so an empty form can flag both at once.
export function validateLogin({ username, password }) {
  return {
    username: username.trim() ? "" : "Username is required.",
    // Passwords are never trimmed: leading or trailing spaces are part of
    // the password, so only emptiness is checked.
    password: password ? "" : "Password is required.",
  };
}

// ---------- Quiz setup ----------

// Validates the number of questions the user typed in. Returns a
// clear error message, or null when the value can start a quiz.
export function validateQuestionCount(rawValue, totalCards) {
  const value = rawValue.trim();

  if (value === "") {
    return "Enter the number of questions you want.";
  }

  // Plain digits only, so decimals ("2.5"), negative numbers ("-3")
  // and letters are rejected before any maths happens.
  if (!/^\d+$/.test(value)) {
    return "Enter a whole number of questions (no decimals or negative numbers).";
  }

  const count = Number(value);

  if (count < 1) {
    return "The number of questions must be at least 1.";
  }

  if (count > totalCards) {
    const questionWord = totalCards === 1 ? "question" : "questions";
    const cardWord = totalCards === 1 ? "flashcard" : "flashcards";
    return `You can only create a quiz with up to ${totalCards} ${questionWord} because this set contains ${totalCards} ${cardWord}.`;
  }

  return null;
}
