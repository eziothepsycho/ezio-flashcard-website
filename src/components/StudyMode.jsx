import { useMemo, useState } from "react";
import "./StudyMode.css";

function learningCounts(cards) {
  return {
    known: cards.filter((card) => card.learningStatus === "known").length,
    learning: cards.filter((card) => card.learningStatus === "learning").length,
  };
}

function StudyMode({ cards, onExit, onHome, onSetStatus }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState("term");
  const [sorting, setSorting] = useState("browsing");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftFront, setDraftFront] = useState("term");
  const [draftSorting, setDraftSorting] = useState("browsing");
  const [sessionIds, setSessionIds] = useState(() => cards.map((card) => card.id));
  const [sessionType, setSessionType] = useState("all");
  const [stage, setStage] = useState("session");

  const sessionCards = useMemo(
    () => sessionIds.map((id) => cards.find((card) => card.id === id)).filter(Boolean),
    [cards, sessionIds]
  );
  const activeCards = sorting === "basic" ? sessionCards : cards;
  const card = activeCards[index];
  const isFirst = index === 0;
  const isLast = index === activeCards.length - 1;
  const counts = learningCounts(cards);

  function goTo(nextIndex) {
    setIndex(nextIndex);
    setFlipped(false);
  }

  function finishBrowsing() {
    setFlipped(false);
    setStage("browsing-complete");
  }

  function goHome() {
    if (onHome) onHome();
    else onExit();
  }

  function beginAllCardsSession() {
    setSessionIds(cards.map((item) => item.id));
    setSessionType("all");
    setIndex(0);
    setFlipped(false);
    setStage("session");
  }

  function beginReviewSession() {
    const reviewIds = cards
      .filter((item) => item.learningStatus === "learning")
      .map((item) => item.id);
    if (!reviewIds.length) {
      setStage("success");
      return;
    }
    setSessionIds(reviewIds);
    setSessionType("review");
    setIndex(0);
    setFlipped(false);
    setStage("session");
  }

  function classify(status) {
    onSetStatus(card.id, status);

    if (sessionType === "review") {
      const nextIds = status === "known"
        ? sessionIds.filter((id) => id !== card.id)
        : sessionIds;
      if (!nextIds.length) {
        setStage("success");
        return;
      }
      setSessionIds(nextIds);
      const nextIndex = status === "known"
        ? (index >= nextIds.length ? 0 : index)
        : (index === nextIds.length - 1 ? 0 : index + 1);
      goTo(nextIndex);
      return;
    }

    if (isLast) {
      setStage("complete");
    } else {
      goTo(index + 1);
    }
  }

  function openSettings() {
    setDraftFront(front);
    setDraftSorting(sorting);
    setSettingsOpen(true);
  }

  function applySettings() {
    setFront(draftFront);
    setSorting(draftSorting);
    setFlipped(false);
    if (draftSorting === "basic") beginAllCardsSession();
    else {
      setIndex(0);
      setStage("session");
    }
    setSettingsOpen(false);
  }

  if (stage === "browsing-complete") {
    return (
      <div className="study-mode">
        <section className="study-completion" aria-labelledby="study-browsing-complete-title">
          <p className="study-eyebrow">Nice browsing!</p>
          <h2 id="study-browsing-complete-title">You finished browsing your flashcards.</h2>
          <p className="study-completion-note">
            You went through all {cards.length} {cards.length === 1 ? "card" : "cards"} in this set.
          </p>
          <div className="study-completion-actions">
            <button className="btn btn-primary" onClick={beginAllCardsSession}>Restart Flashcards</button>
            <button className="btn-text" onClick={goHome}>Back to Home</button>
          </div>
        </section>
      </div>
    );
  }

  if (stage === "complete" || stage === "success") {
    const allKnown = stage === "success" || counts.learning === 0;
    return (
      <div className="study-mode">
        <section className="study-completion" aria-labelledby="study-completion-title">
          <p className="study-eyebrow">{allKnown ? "Great job!" : "Study complete!"}</p>
          <h2 id="study-completion-title">
            {allKnown ? "You know all your cards." : "You finished sorting all your cards."}
          </h2>
          <div className="study-completion-counts">
            <span>✓ I Know This: {counts.known}</span>
            <span>× I Don&apos;t Know This: {counts.learning}</span>
          </div>
          {allKnown ? (
            <p className="study-completion-note">All cards are now marked as “I Know This.”</p>
          ) : (
            <p className="study-completion-note">Review the cards you marked as still learning.</p>
          )}
          <div className="study-completion-actions">
            {!allKnown && <button className="btn btn-primary" onClick={beginReviewSession}>Study Cards I Don&apos;t Know</button>}
            <button className={allKnown ? "btn btn-primary" : "btn"} onClick={beginAllCardsSession}>Restart All Cards</button>
            <button className="btn-text" onClick={goHome}>Back to Home</button>
          </div>
        </section>
      </div>
    );
  }

  const frontText = front === "term" ? card.term : card.definition;
  const backText = front === "term" ? card.definition : card.term;
  return (
    <div className="study-mode">
      <div className="study-session-header">
        <button className="btn-text back-link" onClick={onExit}>← Exit study</button>
        <div className="study-session-tools">
          <span className="study-position">{index + 1} / {activeCards.length}</span>
          <button className="btn-text study-settings-button" onClick={openSettings} aria-label="Build your session">⚙ <span>Options</span></button>
        </div>
      </div>
      {sorting === "basic" && sessionType === "review" && <p className="study-review-count">Cards to review: {activeCards.length}</p>}
      <button className={`study-card ${flipped ? "study-card-flipped" : ""}`} onClick={() => setFlipped((value) => !value)} aria-label="Flip flashcard">
        <span className="study-card-side">{flipped ? "Back" : "Front"}</span>
        <span className="study-card-text">{flipped ? backText : frontText}</span>
        <span className="study-card-hint">{flipped ? "Click to see the other side" : "Click to reveal"}</span>
      </button>
      {sorting === "basic" && <div className="study-rating" aria-label="Sort this flashcard">
        <button className="btn study-learning" onClick={() => classify("learning")}>I Don&apos;t Know This</button>
        <button className="btn study-known" onClick={() => classify("known")}>I Know This</button>
      </div>}
      {sorting === "browsing" && <div className="study-nav">
        <button className="btn" onClick={() => goTo(index - 1)} disabled={isFirst}>Previous</button>
        <button className="btn" onClick={() => goTo(index + 1)} disabled={isLast}>Next</button>
        <button className={`btn study-finish-button${isLast ? " btn-primary" : ""}`} onClick={finishBrowsing}>Finish</button>
      </div>}
      {settingsOpen && <SettingsPanel
        draftFront={draftFront}
        draftSorting={draftSorting}
        onFrontChange={setDraftFront}
        onSortingChange={setDraftSorting}
        onClose={() => setSettingsOpen(false)}
        onApply={applySettings}
      />}
    </div>
  );
}

function SettingsPanel({ draftFront, draftSorting, onFrontChange, onSortingChange, onClose, onApply }) {
  return <div className="study-settings-overlay" onClick={onClose}>
    <section className="study-settings" role="dialog" aria-modal="true" aria-labelledby="study-settings-title" onClick={(event) => event.stopPropagation()}>
      <div className="study-settings-header"><h2 id="study-settings-title">Build Your Session</h2><button className="btn-text study-close-button" onClick={onClose} aria-label="Close settings">×</button></div>
      <fieldset className="study-settings-group"><legend>Flashcard sorting</legend>
        <label className="study-sorting-option"><input type="radio" name="sorting" checked={draftSorting === "browsing"} onChange={() => onSortingChange("browsing")} /><span><strong>Browsing</strong><small>Standard flashcard flipping. Great for familiarizing yourself with terms.</small></span></label>
        <label className="study-sorting-option"><input type="radio" name="sorting" checked={draftSorting === "basic"} onChange={() => onSortingChange("basic")} /><span><strong>Basic sorting</strong><small>Traditional flashcard sorting. Great for learning new terms and cramming.</small></span></label>
      </fieldset>
      <fieldset className="study-settings-group"><legend>Front of card</legend><div className="study-front-options">
        <label className="study-front-option"><input type="radio" name="front" checked={draftFront === "term"} onChange={() => onFrontChange("term")} /><span>Term</span></label>
        <label className="study-front-option"><input type="radio" name="front" checked={draftFront === "definition"} onChange={() => onFrontChange("definition")} /><span>Definition</span></label>
      </div></fieldset>
      <button className="btn btn-primary study-apply-settings" onClick={onApply}>Apply settings</button>
    </section>
  </div>;
}

export default StudyMode;
