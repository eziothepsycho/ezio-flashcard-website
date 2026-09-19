// Builds multiple-choice quiz questions from a flashcard set.
// Each question asks for the definition of a term; the correct
// answer plus three other definitions (as distractors) are
// shuffled into A/B/C/D choices.

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

export function generateQuiz(cards, count) {
  const selected = shuffle(cards).slice(0, count);

  return selected.map((card) => {
    const others = cards.filter((c) => c.id !== card.id);
    // Prefer distractors whose text actually differs from the
    // correct answer, so we don't end up with two identical
    // choices. Fall back to any other card if there aren't
    // enough distinct ones.
    const distinctOthers = others.filter(
      (c) => c.definition !== card.definition
    );
    const pool = distinctOthers.length >= 3 ? distinctOthers : others;
    const distractorTexts = shuffle(pool)
      .slice(0, 3)
      .map((c) => c.definition);

    const choiceTexts = shuffle([card.definition, ...distractorTexts]);
    const options = choiceTexts.map((text, i) => ({
      id: OPTION_LETTERS[i],
      text,
    }));

    const correctOptionId = options.find(
      (opt) => opt.text === card.definition
    ).id;

    return {
      cardId: card.id,
      term: card.term,
      prompt: `What is ${card.term}?`,
      options,
      correctOptionId,
    };
  });
}