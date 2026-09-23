import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "./App.css";
import * as flashcardBackend from "./data/flashcardBackend";
import * as localImport from "./data/localImport";
import { useAuth } from "./data/useAuth";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import ImportDataNotice from "./components/ImportDataNotice";
import SetDetail from "./components/SetDetail";
import SetFormModal from "./components/SetFormModal";

function App() {
  const { user, restoring, register, login, logout } = useAuth();
  const [sets, setSets] = useState(() => flashcardBackend.getSetsNow(user?.id ?? null));
  const [setsLoading, setSetsLoading] = useState(flashcardBackend.usingApi);
  const [setsError, setSetsError] = useState("");
  const [activeSetId, setActiveSetId] = useState(null);
  const [formState, setFormState] = useState(null); // null | { mode: "create" } | { mode: "edit", set }
  const [notice, setNotice] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const userId = user?.id ?? null;

  // A slow answer must never overwrite a newer one.
  const loadTicket = useRef(0);

  const handleLogout = useCallback(() => {
    logout();
    // Nothing from the previous session should stay on screen.
    setSets([]);
    setActiveSetId(null);
    setFormState(null);
    setNotice("");
    setSetsError("");
    setImportResult(null);
    setImportBusy(false);
  }, [logout]);

  // The data layer already turns failures into readable messages. A token the
  // server no longer accepts sends the user back to the login screen instead of
  // leaving them on a dashboard that cannot load.
  const handleFailure = useCallback(
    (err, fallback) => {
      console.error(fallback, err);

      if (err?.code === "unauthenticated") {
        handleLogout();
        return;
      }

      setSetsError(err?.message || fallback);
    },
    [handleLogout]
  );

  // Only ever loads the signed-in user's sets.
  const refreshSets = useCallback(async () => {
    const ticket = (loadTicket.current += 1);

    try {
      const loaded = userId ? await flashcardBackend.getSets(userId) : [];
      if (ticket !== loadTicket.current) return;

      setSets(loaded);
      setSetsError("");
    } catch (err) {
      if (ticket !== loadTicket.current) return;

      handleFailure(err, "Could not load your sets.");
    } finally {
      if (ticket === loadTicket.current) setSetsLoading(false);
    }
  }, [userId, handleFailure]);

  useEffect(() => {
    refreshSets();
  }, [refreshSets]);

  // API mode only: once, offer to bring the sets this browser already holds into
  // the account that is signed in. Read during render, because localStorage can
  // answer straight away — no effect, no flash.
  const importPlan = useMemo(() => {
    if (!flashcardBackend.usingApi || !user) return null;

    return localImport.planImport(user.username);
  }, [user]);

  async function handleRegister(username, password) {
    const result = await register(username, password);
    if (result.ok && result.adoptedSets > 0) {
      setNotice(
        result.adoptedSets === 1
          ? "1 set saved before accounts existed is now yours."
          : `${result.adoptedSets} sets saved before accounts existed are now yours.`
      );
    }
    return result;
  }

  async function handleCreateSet({ title, description }) {
    try {
      await flashcardBackend.createSet({ userId, title, description });
      setFormState(null);
      await refreshSets();
    } catch (err) {
      // The form closes either way, so the message behind it stays readable.
      setFormState(null);
      handleFailure(err, "Could not create the set.");
    }
  }

  async function handleEditSet({ title, description }) {
    const setId = formState.set.id;

    try {
      await flashcardBackend.updateSet(setId, userId, { title, description });
      setFormState(null);
      await refreshSets();
    } catch (err) {
      setFormState(null);
      handleFailure(err, "Could not save the set.");
    }
  }

  async function handleDeleteSet(setId) {
    const confirmed = window.confirm(
      "Delete this set and all its flashcards? This can't be undone."
    );
    if (!confirmed) return;

    try {
      await flashcardBackend.deleteSet(setId, userId);
      if (activeSetId === setId) setActiveSetId(null);
      await refreshSets();
    } catch (err) {
      handleFailure(err, "Could not delete the set.");
    }
  }

  // The one-time migration: send what this browser holds and leave the local copy
  // exactly where it is (docs/migration.md).
  async function handleImportLocalData() {
    if (!importPlan) return;

    setImportBusy(true);
    try {
      const result = await flashcardBackend.importSets(
        localImport.buildImportPayload(importPlan)
      );
      localImport.markImported();
      setImportResult(result);
      await refreshSets();
    } catch (err) {
      handleFailure(err, "Could not import this browser's sets.");
    } finally {
      setImportBusy(false);
    }
  }

  // API mode: the session is being confirmed with the server. That is the only
  // thing on screen until the answer arrives, so the login form never flashes and
  // authenticated content is never shown before it is verified. Local mode reads
  // localStorage during the first render, so it never reaches this branch.
  if (restoring) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1 className="wordmark">cards.</h1>
          <p className="tagline">Restoring your session…</p>
        </div>
      </div>
    );
  }

  // No signed-in user: the whole app sits behind this screen.
  if (!user) {
    return <AuthScreen onLogin={login} onRegister={handleRegister} />;
  }

  const activeSet = sets.find((s) => s.id === activeSetId) || null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-brand">
          <h1 className="wordmark">cards.</h1>
          <p className="tagline">Your flashcard sets, studied your way.</p>
        </div>
        <div className="app-account">
          <span className="app-account-name">Welcome, {user.username}</span>
          <button className="btn-text" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        {notice && <p className="app-notice">{notice}</p>}
        {setsError && <p className="app-notice app-notice-error">{setsError}</p>}
        <ImportDataNotice
          // The plan only counts sets that could actually be this person's (see
          // data/localImport.js), so a brand-new account on an untouched browser —
          // or one arriving on somebody else's device — is offered nothing.
          plan={
            importPlan &&
            !importResult &&
            !importPlan.alreadyImportedAt &&
            importPlan.importable > 0
              ? importPlan
              : null
          }
          result={importResult}
          busy={importBusy}
          onImport={handleImportLocalData}
        />

        {setsLoading && sets.length === 0 ? (
          <p className="tagline">Loading your sets…</p>
        ) : activeSet ? (
          <SetDetail
            set={activeSet}
            userId={userId}
            onBack={() => setActiveSetId(null)}
          />
        ) : (
          <Dashboard
            sets={sets}
            onOpenSet={(id) => setActiveSetId(id)}
            onCreateSet={() => setFormState({ mode: "create" })}
            onEditSet={(set) => setFormState({ mode: "edit", set })}
            onDeleteSet={handleDeleteSet}
          />
        )}
      </main>

      {formState && (
        <SetFormModal
          mode={formState.mode}
          initialSet={formState.mode === "edit" ? formState.set : null}
          onCancel={() => setFormState(null)}
          onSubmit={formState.mode === "create" ? handleCreateSet : handleEditSet}
        />
      )}
    </div>
  );
}

export default App;