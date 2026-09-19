import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { getSets, createSet, updateSet, deleteSet } from "./data/db";
import Dashboard from "./components/Dashboard";
import SetDetail from "./components/SetDetail";
import SetFormModal from "./components/SetFormModal";

function App() {
  const [sets, setSets] = useState([]);
  const [activeSetId, setActiveSetId] = useState(null);
  const [formState, setFormState] = useState(null); // null | { mode: "create" } | { mode: "edit", set }

  const refreshSets = useCallback(() => {
    setSets(getSets());
  }, []);

  useEffect(() => {
    refreshSets();
  }, [refreshSets]);

  function handleCreateSet({ title, description }) {
    createSet({ title, description });
    refreshSets();
    setFormState(null);
  }

  function handleEditSet({ title, description }) {
    updateSet(formState.set.id, { title, description });
    refreshSets();
    setFormState(null);
  }

  function handleDeleteSet(setId) {
    const confirmed = window.confirm(
      "Delete this set and all its flashcards? This can't be undone."
    );
    if (!confirmed) return;
    deleteSet(setId);
    if (activeSetId === setId) setActiveSetId(null);
    refreshSets();
  }

  const activeSet = sets.find((s) => s.id === activeSetId) || null;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="wordmark">cards.</h1>
        <p className="tagline">Your flashcard sets, studied your way.</p>
      </header>

      <main className="app-main">
        {activeSet ? (
          <SetDetail set={activeSet} onBack={() => setActiveSetId(null)} />
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