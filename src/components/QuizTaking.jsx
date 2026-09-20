import { useState, useEffect, useRef } from "react";
import "./QuizTaking.css";
import { generateQuiz } from "../utils/generateQuiz";

// How long a picked answer stays highlighted before the quiz moves
// on to the next question.
const ADVANCE_DELAY_MS = 300;

function QuizTaking({ cards, count, direction, onExit, onComplete }) {
  // Generated once, on mount, so the question set (and the chosen
  // direction) stays fixed for the whole quiz session even if the
  // underlying cards list re-renders.
  const [questions] = useState(() => generateQuiz(cards, count, direction));
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState([]);
  const advanceTimer = useRef(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  // Drop a pending auto-advance if the quiz is left mid-transition.
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // Picking an answer is all it takes: the choice is highlighted
  // briefly, then the quiz moves on to the next question — or shows
  // the results when it was the last one.
  function handleSelect(optionId) {
    // Ignore repeat clicks while the chosen answer is showing.
    if (selectedOption !== null) return;

    setSelectedOption(optionId);

    advanceTimer.current = setTimeout(() => {
      const updatedAnswers = [
        ...answers,
        { question, selectedOptionId: optionId },
      ];

      if (isLast) {
        onComplete(updatedAnswers);
        return;
      }

      setAnswers(updatedAnswers);
      setSelectedOption(null);
      setIndex(index + 1);
    }, ADVANCE_DELAY_MS);
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
            onClick={() => handleSelect(option.id)}
          >
            <span className="quiz-choice-letter">{option.id}</span>
            <span>{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuizTaking;