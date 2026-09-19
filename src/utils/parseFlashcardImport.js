// Parses TAB-separated "term<TAB>definition" text into flashcards.
// Returns both the rows that parsed cleanly and the ones that
// didn't, so the UI can show a preview plus any problems before
// anything gets saved.

export function parseFlashcardImport(rawText) {
  const lines = rawText.split(/\r\n|\r|\n/);
  const valid = [];
  const invalid = [];

  lines.forEach((line, index) => {
    if (line.trim() === "") return; // ignore blank lines

    const tabIndex = line.indexOf("\t");
    if (tabIndex === -1) {
      invalid.push({
        lineNumber: index + 1,
        text: line,
        reason: "No tab character found between term and definition.",
      });
      return;
    }

    const term = line.slice(0, tabIndex).trim();
    const definition = line.slice(tabIndex + 1).trim();

    if (!term || !definition) {
      invalid.push({
        lineNumber: index + 1,
        text: line,
        reason: !term ? "Missing term." : "Missing definition.",
      });
      return;
    }

    valid.push({ term, definition });
  });

  return { valid, invalid };
}