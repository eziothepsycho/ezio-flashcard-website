import { useState } from "react";
import "./QuizSetup.css";
import { validateQuestionCount } from "../../shared/validation.js";

// Which side of each flashcard becomes the question.
const QUESTION_DIRECTIONS = [
  {
    id: "term-to-definition",
    label: "Term → Definition",
    example: "“Database” → “A system used to store and manage structured data.”",
  },
  {
    id: "definition-to-term",
    label: "Definition → Term",
    example: "“A system used to store and manage structured data.” → “Database”",
  },
];

function QuizSetup({ totalCards, onBack, onStart }) {
  const [direction, setDirection] = useState(QUESTION_DIRECTIONS[0].id);
  // Kept as a string so the field can be empty while the user types.
  const [countInput, setCountInput] = useState(() =>
    String(Math.min(10, totalCards))
  );
  const [error, setError] = useState("");

  function handleCountChange(e) {
    const value = e.target.value;
    setCountInput(value);
    // Once an error is showing, keep it up to date while the user
    // types so it clears as soon as the number is valid.
    if (error) setError(validateQuestionCount(value, totalCards) || "");
  }

  function handleSubmit(e) {
    e.preventDefault();
    const message = validateQuestionCount(countInput, totalCards);

    if (message) {
      // Stay on the setup screen until the number is valid.
      setError(message);
      return;
    }

    setError("");
    onStart({ count: Number(countInput), direction });
  }

  return (
    <div className="quiz-setup">
      <button className="btn-text back-link" onClick={onBack}>
        ← Back to flashcards
      </button>

      <h2>Quiz Session Setup</h2>
      <p className="quiz-setup-help">
        This set has {totalCards} flashcard{totalCards === 1 ? "" : "s"}. Choose
        how the quiz should work, then start when you&apos;re ready.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <h3 className="quiz-setup-group-title">Question direction</h3>
        <div className="quiz-options">
          {QUESTION_DIRECTIONS.map((option) => (
            <label key={option.id} className="quiz-option">
              <input
                type="radio"
                name="question-direction"
                checked={direction === option.id}
                onChange={() => setDirection(option.id)}
              />
              <span className="quiz-option-body">
                <span className="quiz-option-label">{option.label}</span>
                <span className="quiz-option-example">{option.example}</span>
              </span>
            </label>
          ))}
        </div>

        <h3 className="quiz-setup-group-title" id="quiz-count-title">
          Number of questions
        </h3>
        <div className="quiz-count-field">
          <input
            id="quiz-count"
            className="quiz-count-input"
            type="number"
            inputMode="numeric"
            min="1"
            max={totalCards}
            step="1"
            value={countInput}
            onChange={handleCountChange}
            aria-labelledby="quiz-count-title"
            aria-describedby={error ? "quiz-count-error" : "quiz-count-hint"}
            aria-invalid={error ? "true" : undefined}
          />
          {error ? (
            <p id="quiz-count-error" className="quiz-error" role="alert">
              {error}
            </p>
          ) : (
            <p id="quiz-count-hint" className="quiz-count-hint">
              Enter a whole number from 1 to {totalCards}.
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-primary">
          Start Quiz
        </button>
      </form>
    </div>
  );
}

export default QuizSetup;