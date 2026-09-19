import { useState } from "react";
import "./QuizSetup.css";

const STANDARD_COUNTS = [5, 10, 15];

function QuizSetup({ totalCards, onBack, onStart }) {
  const availableCounts = STANDARD_COUNTS.filter((n) => n <= totalCards);
  const options = [...availableCounts, "all"];
  const [selected, setSelected] = useState(options[0]);

  function handleSubmit(e) {
    e.preventDefault();
    const count = selected === "all" ? totalCards : selected;
    onStart(count);
  }

  return (
    <div className="quiz-setup">
      <button className="btn-text back-link" onClick={onBack}>
        ← Back to flashcards
      </button>

      <h2>Number of questions</h2>
      <p className="quiz-setup-help">
        This set has {totalCards} flashcard{totalCards === 1 ? "" : "s"}.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="quiz-options">
          {options.map((option) => (
            <label key={option} className="quiz-option">
              <input
                type="radio"
                name="question-count"
                checked={selected === option}
                onChange={() => setSelected(option)}
              />
              <span>{option === "all" ? `All ${totalCards}` : option}</span>
            </label>
          ))}
        </div>

        <button type="submit" className="btn btn-primary">
          Start Quiz
        </button>
      </form>
    </div>
  );
}

export default QuizSetup;