import "./QuizResults.css";

// One reviewed question: the answer the user picked, plus the right
// answer when they got it wrong.
function ReviewItem({ entry, showCorrectAnswer }) {
  const { question, selectedOptionId, number, isCorrect } = entry;
  const selectedOption = question.options.find(
    (option) => option.id === selectedOptionId
  );
  const correctOption = question.options.find(
    (option) => option.id === question.correctOptionId
  );

  return (
    <li className={"quiz-review-item " + (isCorrect ? "quiz-review-correct" : "quiz-review-incorrect")}>
      <div className="quiz-review-heading">
        <p className="quiz-review-question">{number}. {question.prompt}</p>
        <span className="quiz-review-status">{isCorrect ? "Correct" : "Incorrect"}</span>
      </div>
      <p className="quiz-review-answer"><span>Your answer</span>{selectedOption.text}</p>
      {showCorrectAnswer && (
        <p className="quiz-review-answer quiz-review-correct-answer"><span>Correct answer</span>{correctOption.text}</p>
      )}
    </li>
  );
}

function QuizResults({ answers, onBack, onTryAgain, onHome }) {
  // Tag every answer once with its quiz position and whether it was
  // right, so both review groups can be split from the same data.
  const reviewEntries = answers.map(({ question, selectedOptionId }, index) => ({
    question,
    selectedOptionId,
    number: index + 1,
    isCorrect: selectedOptionId === question.correctOptionId,
  }));
  const incorrectAnswers = reviewEntries.filter((entry) => !entry.isCorrect);
  const correctAnswers = reviewEntries.filter((entry) => entry.isCorrect);
  const correctCount = correctAnswers.length;
  const incorrectCount = incorrectAnswers.length;
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

        <section className="quiz-review-group" aria-labelledby="review-incorrect-title">
          <h4 className="quiz-review-group-title" id="review-incorrect-title">Incorrect</h4>
          {incorrectAnswers.length === 0 ? (
            <p className="quiz-review-empty">No incorrect answers.</p>
          ) : (
            <ol className="quiz-review-list">
              {incorrectAnswers.map((entry) => (
                <ReviewItem key={entry.question.cardId} entry={entry} showCorrectAnswer />
              ))}
            </ol>
          )}
        </section>

        <section className="quiz-review-group" aria-labelledby="review-correct-title">
          <h4 className="quiz-review-group-title" id="review-correct-title">Correct</h4>
          {correctAnswers.length === 0 ? (
            <p className="quiz-review-empty">No correct answers.</p>
          ) : (
            <ol className="quiz-review-list">
              {correctAnswers.map((entry) => (
                <ReviewItem key={entry.question.cardId} entry={entry} showCorrectAnswer={false} />
              ))}
            </ol>
          )}
        </section>
      </section>
    </div>
  );
}

export default QuizResults;
