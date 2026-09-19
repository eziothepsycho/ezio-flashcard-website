import { useState } from "react";
import "./SetFormModal.css";
import "./ImportModal.css";
import { parseFlashcardImport } from "../utils/parseFlashcardImport";

function ImportModal({ onCancel, onConfirm }) {
  const [step, setStep] = useState("paste"); // "paste" | "preview"
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState({ valid: [], invalid: [] });

  function handlePreview(e) {
    e.preventDefault();
    setParsed(parseFlashcardImport(rawText));
    setStep("preview");
  }

  function handleConfirm() {
    onConfirm(parsed.valid);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        {step === "paste" ? (
          <>
            <h2>Import flashcards</h2>
            <p className="import-help">
              Paste term-and-definition pairs, one per line, separated by a
              TAB character — this is what you get when you copy cells
              straight from a spreadsheet.
            </p>
            <form onSubmit={handlePreview}>
              <label className="field">
                <span>Flashcard data</span>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={10}
                  placeholder={
                    "Photosynthesis\tThe process by which plants convert light into energy\nMitosis\tA type of cell division"
                  }
                  autoFocus
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={onCancel}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={rawText.trim() === ""}
                >
                  Preview
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2>Import preview</h2>

            {parsed.invalid.length > 0 && (
              <div className="import-invalid">
                <p className="import-invalid-title">
                  {parsed.invalid.length} row
                  {parsed.invalid.length === 1 ? "" : "s"} couldn't be read:
                </p>
                <ul>
                  {parsed.invalid.map((row) => (
                    <li key={row.lineNumber}>
                      Line {row.lineNumber}: {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.valid.length === 0 ? (
              <p className="import-empty">
                No valid flashcards found. Go back and check the format.
              </p>
            ) : (
              <ol className="import-preview-list">
                {parsed.valid.map((card, i) => (
                  <li key={i}>
                    <p className="import-preview-term">{card.term}</p>
                    <p className="import-preview-definition">
                      {card.definition}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            <p className="import-total">
              Total: {parsed.valid.length} flashcard
              {parsed.valid.length === 1 ? "" : "s"}
            </p>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={parsed.valid.length === 0}
                onClick={handleConfirm}
              >
                Import Flashcards
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ImportModal;