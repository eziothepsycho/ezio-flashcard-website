import { useState } from "react";
import "./SetFormModal.css";

function SetFormModal({ mode, initialSet, onCancel, onSubmit }) {
  const [title, setTitle] = useState(initialSet?.title ?? "");
  const [description, setDescription] = useState(
    initialSet?.description ?? ""
  );
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Give the set a title.");
      return;
    }
    onSubmit({ title: trimmedTitle, description: description.trim() });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === "create" ? "New flashcard set" : "Edit set"}</h2>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>
          {error && <p className="field-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === "create" ? "Create set" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SetFormModal;