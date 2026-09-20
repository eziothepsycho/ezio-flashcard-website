import "./QuizResults.css";

function QuizResults({ answers, onBack, onTryAgain, onHome }) {
  const correctCount = answers.filter(
    ({ question, selectedOptionId }) => selectedOptionId === question.correctOptionId
  ).length;
  const incorrectCount = answers.length - correctCount;
  const score = Math.round((correctCount / answers.length) * 100);

  return (
    <div className="quiz-results">
      <button className="btn-text back-link" onClick={onBack}>← Back to flashcards</button>
      <section className="quiz-results-summary" aria-labelledby="results-title">
        <p className="quiz-results-eyebrow">Quiz complete</p>
        <h2 id="results-title">{score}% correct</h2>
        <p className="quiz-results-score">You answered {correctCount} of {answers.length} questions correctly.</p>
        <div className="quiz-results-counts" aria-label="Quiz score breakdown">
          <span>{correctCount} correct</span>
          <span>{incorrectCount} incorrect</span>
        </div>
        <div className="quiz-results-actions">
          <button className="btn btn-primary" onClick={onTryAgain}>Try another quiz</button>
          <button className="btn" onClick={onHome}>Go Back Home</button>
        </div>
      </section>
      <section className="quiz-review" aria-labelledby="review-title">
        <h3 id="review-title">Review answers</h3>
        <ol className="quiz-review-list">
          {answers.map(({ question, selectedOptionId }, index) => {
            const selectedOption = question.options.find((option) => option.id === selectedOptionId);
            const correctOption = question.options.find((option) => option.id === question.correctOptionId);
            const isCorrect = selectedOptionId === question.correctOptionId;
            return (
              <li key={question.cardId} className={"quiz-review-item " + (isCorrect ? "quiz-review-correct" : "quiz-review-incorrect")}>
                <div className="quiz-review-heading">
                  <p className="quiz-review-question">{index + 1}. {question.prompt}</p>
                  <span className="quiz-review-status">{isCorrect ? "Correct" : "Incorrect"}</span>
                </div>
                <p className="quiz-review-answer"><span>Your answer</span>{selectedOption.text}</p>
                {!isCorrect && <p className="quiz-review-answer quiz-review-correct-answer"><span>Correct answer</span>{correctOption.text}</p>}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

export default QuizResults;
