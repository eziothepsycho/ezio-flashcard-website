import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { getSets, createSet, updateSet, deleteSet } from "./data/db";
import { useAuth } from "./data/useAuth";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import SetDetail from "./components/SetDetail";
import SetFormModal from "./components/SetFormModal";

function App() {
  const { user, register, login, logout } = useAuth();
  const [sets, setSets] = useState([]);
  const [activeSetId, setActiveSetId] = useState(null);
  const [formState, setFormState] = useState(null); // null | { mode: "create" } | { mode: "edit", set }
  const [notice, setNotice] = useState("");

  const userId = user?.id ?? null;

  // Only ever loads the signed-in user's sets.
  const refreshSets = useCallback(() => {
    setSets(userId ? getSets(userId) : []);
  }, [userId]);

  useEffect(() => {
    refreshSets();
  }, [refreshSets]);

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

  function handleLogout() {
    logout();
    // Nothing from the previous session should stay on screen.
    setSets([]);
    setActiveSetId(null);
    setFormState(null);
    setNotice("");
  }

  function handleCreateSet({ title, description }) {
    createSet({ userId, title, description });
    refreshSets();
    setFormState(null);
  }

  function handleEditSet({ title, description }) {
    updateSet(formState.set.id, userId, { title, description });
    refreshSets();
    setFormState(null);
  }

  function handleDeleteSet(setId) {
    const confirmed = window.confirm(
      "Delete this set and all its flashcards? This can't be undone."
    );
    if (!confirmed) return;
    deleteSet(setId, userId);
    if (activeSetId === setId) setActiveSetId(null);
    refreshSets();
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

        {activeSet ? (
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