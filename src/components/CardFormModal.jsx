import { useState } from "react";
import "./SetFormModal.css";

function CardFormModal({ mode, initialCard, onCancel, onSubmit }) {
  const [term, setTerm] = useState(initialCard?.term ?? "");
  const [definition, setDefinition] = useState(initialCard?.definition ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedTerm = term.trim();
    const trimmedDefinition = definition.trim();
    if (!trimmedTerm || !trimmedDefinition) {
      setError("Both term and definition are required.");
      return;
    }
    onSubmit({ term: trimmedTerm, definition: trimmedDefinition });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === "create" ? "New flashcard" : "Edit flashcard"}</h2>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Term</span>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Definition</span>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows={4}
            />
          </label>
          {error && <p className="field-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === "create" ? "Add flashcard" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CardFormModal;