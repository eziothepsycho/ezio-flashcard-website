import { useState, useEffect, useCallback, useRef } from "react";
import "./SetDetail.css";
import * as flashcardBackend from "../data/flashcardBackend";
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
  const [cards, setCards] = useState(() =>
    flashcardBackend.getCardsBySetNow(set.id, userId)
  );
  const [cardsLoading, setCardsLoading] = useState(flashcardBackend.usingApi);
  const [cardsError, setCardsError] = useState("");
  const [formState, setFormState] = useState(null); // null | { mode: "create" } | { mode: "edit", card }
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState("list"); // "list" | "study" | "quiz-setup" | "quiz" | "quiz-results"
  const [quizConfig, setQuizConfig] = useState(null); // { count, direction }
  const [quizAnswers, setQuizAnswers] = useState(null);

  // A slow answer must never overwrite a newer one.
  const loadTicket = useRef(0);

  const refreshCards = useCallback(async () => {
    const ticket = (loadTicket.current += 1);

    try {
      const loaded = await flashcardBackend.getCardsBySet(set.id, userId);
      if (ticket !== loadTicket.current) return;

      setCards(loaded);
      setCardsError("");
    } catch (err) {
      if (ticket !== loadTicket.current) return;

      reportFailure(err, "Could not load the flashcards.");
    } finally {
      if (ticket === loadTicket.current) setCardsLoading(false);
    }
  }, [set.id, userId]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  function reportFailure(err, fallback) {
    console.error(fallback, err);
    setCardsError(err?.message || fallback);
  }

  async function handleCreateCard({ term, definition }) {
    try {
      await flashcardBackend.createCard({ setId: set.id, userId, term, definition });
      setFormState(null);
      await refreshCards();
    } catch (err) {
      // The form closes either way, so the message behind it stays readable.
      setFormState(null);
      reportFailure(err, "Could not add the flashcard.");
    }
  }

  async function handleEditCard({ term, definition }) {
    const cardId = formState.card.id;

    try {
      await flashcardBackend.updateCard(cardId, userId, { term, definition });
      setFormState(null);
      await refreshCards();
    } catch (err) {
      setFormState(null);
      reportFailure(err, "Could not save the flashcard.");
    }
  }

  async function handleDeleteCard(cardId) {
    const confirmed = window.confirm("Delete this flashcard?");
    if (!confirmed) return;

    try {
      await flashcardBackend.deleteCard(cardId, userId);
      await refreshCards();
    } catch (err) {
      reportFailure(err, "Could not delete the flashcard.");
    }
  }

  async function handleImportConfirm(validCards) {
    try {
      await flashcardBackend.createCards(set.id, userId, validCards);
      setImportOpen(false);
      await refreshCards();
    } catch (err) {
      setImportOpen(false);
      reportFailure(err, "Could not import those flashcards.");
    }
  }

  function handleStartQuiz({ count, direction }) {
    setQuizConfig({ count, direction });
    setMode("quiz");
  }

  function handleQuizComplete(answers) {
    setQuizAnswers(answers);
    setMode("quiz-results");
  }

  async function handleStudyStatus(cardId, learningStatus) {
    // Show the grade straight away and write it in the background, so a study
    // session never waits on the network. The next refresh confirms it.
    setCards((current) =>
      current.map((card) =>
        card.id === cardId ? { ...card, learningStatus } : card
      )
    );

    try {
      await flashcardBackend.setCardLearningStatus(cardId, userId, learningStatus);
    } catch (err) {
      reportFailure(err, "Could not save that grade.");
      refreshCards();
    }
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

      {cardsError && <p className="app-notice app-notice-error">{cardsError}</p>}

      {cards.length === 0 ? (
        <div className="placeholder">
          <p>
            {cardsLoading ? "Loading flashcards…" : "No flashcards in this set yet."}
          </p>
          {!cardsLoading && (
            <p className="placeholder-note">Add one to get started.</p>
          )}
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
