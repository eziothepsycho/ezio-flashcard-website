// Builds multiple-choice quiz questions from a flashcard set.
// The chosen direction decides which side of a flashcard is asked
// and which side is the answer:
//
//   "term-to-definition" -> question is the term,       answer is the definition
//   "definition-to-term" -> question is the definition, answer is the term
//
// Each question offers the correct answer plus three other answers
// from the same set (as distractors), shuffled into A/B/C/D choices.

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

// Which side of a card is the question, and which side is the answer.
const QUESTION_FIELDS = {
  "term-to-definition": { question: "term", answer: "definition" },
  "definition-to-term": { question: "definition", answer: "term" },
};

export function generateQuiz(cards, count, direction = "term-to-definition") {
  const fields =
    QUESTION_FIELDS[direction] || QUESTION_FIELDS["term-to-definition"];

  // Never generate more questions than the set has flashcards.
  const questionCount = Math.min(count, cards.length);
  const selected = shuffle(cards).slice(0, questionCount);

  return selected.map((card) => {
    const prompt = card[fields.question];
    const correctAnswer = card[fields.answer];

    const others = cards.filter((c) => c.id !== card.id);
    // Prefer distractors whose text actually differs from the
    // correct answer, so we don't end up with two identical
    // choices. Fall back to any other card if there aren't
    // enough distinct ones.
    const distinctOthers = others.filter(
      (c) => c[fields.answer] !== correctAnswer
    );
    const pool = distinctOthers.length >= 3 ? distinctOthers : others;
    const distractorTexts = shuffle(pool)
      .slice(0, 3)
      .map((c) => c[fields.answer]);

    const choiceTexts = shuffle([correctAnswer, ...distractorTexts]);
    const options = choiceTexts.map((text, i) => ({
      id: OPTION_LETTERS[i],
      text,
    }));

    const correctOptionId = options.find(
      (opt) => opt.text === correctAnswer
    ).id;

    return {
      cardId: card.id,
      term: card.term,
      // The question is just the term or the definition itself,
      // depending on the direction the user picked.
      prompt,
      options,
      correctOptionId,
    };
  });
}