// The result of a finished quiz, derived in one place so the screen only renders
// it — and so the rule (every question lands in exactly one section, in the order
// it was asked, with the right answer resolvable for the wrong ones) can be
// checked without a device.
export function summariseQuiz(answers) {
  const reviewed = answers.map(({ question, selectedOptionId }, index) => ({
    question,
    selectedOptionId,
    number: index + 1,
    isCorrect: selectedOptionId === question.correctOptionId,
  }));

  const correct = reviewed.filter((entry) => entry.isCorrect);
  const incorrect = reviewed.filter((entry) => !entry.isCorrect);

  return {
    reviewed,
    correct,
    incorrect,
    score: answers.length === 0 ? 0 : Math.round((correct.length / answers.length) * 100),
  };
}
