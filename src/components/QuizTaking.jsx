import { useState } from "react";
import "./QuizTaking.css";
import { generateQuiz } from "../utils/generateQuiz";

function QuizTaking({ cards, count, onExit, onComplete }) {
  // Generated once, on mount, so the question set doesn't change
  // mid-quiz even if the underlying cards list re-renders.
  const [questions] = useState(() => generateQuiz(cards, count));
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState([]);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  function handleNext() {
    const updatedAnswers = [
      ...answers,
      { question, selectedOptionId: selectedOption },
    ];

    if (isLast) {
      onComplete(updatedAnswers);
      return;
    }

    setAnswers(updatedAnswers);
    setSelectedOption(null);
    setIndex(index + 1);
  }

  return (
    <div className="quiz-taking">
      <div className="quiz-taking-header">
        <button className="btn-text back-link" onClick={onExit}>
          ← Exit quiz
        </button>
        <span className="quiz-progress">
          Question {index + 1} of {questions.length}
        </span>
      </div>

      <h2 className="quiz-prompt">{question.prompt}</h2>

      <div className="quiz-choices">
        {question.options.map((option) => (
          <button
            key={option.id}
            className={
              "quiz-choice" +
              (selectedOption === option.id ? " quiz-choice-selected" : "")
            }
            onClick={() => setSelectedOption(option.id)}
          >
            <span className="quiz-choice-letter">{option.id}</span>
            <span>{option.text}</span>
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary quiz-next"
        onClick={handleNext}
        disabled={selectedOption === null}
      >
        {isLast ? "Finish Quiz" : "Next question"}
      </button>
    </div>
  );
}

export default QuizTaking;