import { useState } from "react";
import "./QuizSetup.css";

// Validates the number of questions the user typed in. Returns a
// clear error message, or null when the value can start a quiz.
function validateQuestionCount(rawValue, totalCards) {
  const value = rawValue.trim();

  if (value === "") {
    return "Enter the number of questions you want.";
  }

  // Plain digits only, so decimals ("2.5"), negative numbers ("-3")
  // and letters are rejected before any maths happens.
  if (!/^\d+$/.test(value)) {
    return "Enter a whole number of questions (no decimals or negative numbers).";
  }

  const count = Number(value);

  if (count < 1) {
    return "The number of questions must be at least 1.";
  }

  if (count > totalCards) {
    const questionWord = totalCards === 1 ? "question" : "questions";
    const cardWord = totalCards === 1 ? "flashcard" : "flashcards";
    return `You can only create a quiz with up to ${totalCards} ${questionWord} because this set contains ${totalCards} ${cardWord}.`;
  }

  return null;
}

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