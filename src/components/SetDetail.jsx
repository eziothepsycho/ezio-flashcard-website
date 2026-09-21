import { useState, useEffect, useCallback } from "react";
import "./SetDetail.css";
import {
  getCardsBySet,
  createCard,
  createCards,
  updateCard,
  setCardLearningStatus,
  deleteCard,
} from "../data/db";
import FlashcardList from "./FlashcardList";
import CardFormModal from "./CardFormModal";
import ImportModal from "./ImportModal";
import StudyMode from "./StudyMode";
import QuizSetup from "./QuizSetup";
import QuizTaking from "./QuizTaking";
import QuizResults from "./QuizResults";

// userId comes from the signed-in account: every read and write below is
// scoped to it, so this screen only ever shows its owner's cards.
function SetDetail({ userId, set, onBack }) {
  const [cards, setCards] = useState([]);
  const [formState, setFormState] = useState(null); // null | { mode: "create" } | { mode: "edit", card }
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState("list"); // "list" | "study" | "quiz-setup" | "quiz" | "quiz-results"
  const [quizConfig, setQuizConfig] = useState(null); // { count, direction }
  const [quizAnswers, setQuizAnswers] = useState(null);

  const refreshCards = useCallback(() => {
    setCards(getCardsBySet(set.id, userId));
  }, [set.id, userId]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  function handleCreateCard({ term, definition }) {
    createCard({ setId: set.id, userId, term, definition });
    refreshCards();
    setFormState(null);
  }

  function handleEditCard({ term, definition }) {
    updateCard(formState.card.id, userId, { term, definition });
    refreshCards();
    setFormState(null);
  }

  function handleDeleteCard(cardId) {
    const confirmed = window.confirm("Delete this flashcard?");
    if (!confirmed) return;
    deleteCard(cardId, userId);
    refreshCards();
  }

  function handleImportConfirm(validCards) {
    createCards(set.id, userId, validCards);
    refreshCards();
    setImportOpen(false);
  }

  function handleStartQuiz({ count, direction }) {
    setQuizConfig({ count, direction });
    setMode("quiz");
  }

  function handleQuizComplete(answers) {
    setQuizAnswers(answers);
    setMode("quiz-results");
  }

  function handleStudyStatus(cardId, learningStatus) {
    setCardLearningStatus(cardId, userId, learningStatus);
    refreshCards();
  }

  if (mode === "study") {
    return (
      <div className="set-detail">
        <StudyMode
          cards={cards}
          onExit={() => setMode("list")}
          onHome={() => {
            setMode("list");
            onBack();
          }}
          onSetStatus={handleStudyStatus}
        />
      </div>
    );
  }

  if (mode === "quiz-setup") {
    return (
      <div className="set-detail">
        <QuizSetup
          totalCards={cards.length}
          onBack={() => setMode("list")}
          onStart={handleStartQuiz}
        />
      </div>
    );
  }

  if (mode === "quiz") {
    return (
      <div className="set-detail">
        <QuizTaking
          cards={cards}
          count={quizConfig.count}
          direction={quizConfig.direction}
          onExit={() => setMode("list")}
          onComplete={handleQuizComplete}
        />
      </div>
    );
  }

  if (mode === "quiz-results") {
    return (
      <div className="set-detail">
        <QuizResults
          answers={quizAnswers}
          onBack={() => setMode("list")}
          onTryAgain={() => setMode("quiz-setup")}
          onHome={() => {
            setMode("list");
            onBack();
          }}
        />
      </div>
    );
  }

  return (
    <div className="set-detail">
      <button className="btn-text back-link" onClick={onBack}>
        ← Back to sets
      </button>

      <div className="set-detail-header">
        <div>
          <h2>{set.title}</h2>
          {set.description && (
            <p className="set-detail-description">{set.description}</p>
          )}
        </div>
        <div className="set-detail-header-actions">
          <button
            className="btn"
            onClick={() => setMode("study")}
            disabled={cards.length === 0}
          >
            Study
          </button>
          <button
            className="btn"
            onClick={() => setMode("quiz-setup")}
            disabled={cards.length < 4}
            title={
              cards.length < 4
                ? "Add at least 4 flashcards to generate a quiz"
                : undefined
            }
          >
            Quiz
          </button>
          <button className="btn" onClick={() => setImportOpen(true)}>
            Import
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setFormState({ mode: "create" })}
          >
            Add flashcard
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="placeholder">
          <p>No flashcards in this set yet.</p>
          <p className="placeholder-note">Add one to get started.</p>
        </div>
      ) : (
        <FlashcardList
          cards={cards}
          onEdit={(card) => setFormState({ mode: "edit", card })}
          onDelete={handleDeleteCard}
        />
      )}

      {importOpen && (
        <ImportModal
          onCancel={() => setImportOpen(false)}
          onConfirm={handleImportConfirm}
        />
      )}

      {formState && (
        <CardFormModal
          mode={formState.mode}
          initialCard={formState.mode === "edit" ? formState.card : null}
          onCancel={() => setFormState(null)}
          onSubmit={
            formState.mode === "create" ? handleCreateCard : handleEditCard
          }
        />
      )}
    </div>
  );
}

export default SetDetail;
