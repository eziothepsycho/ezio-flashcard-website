// The one-time offer to bring the sets this browser already holds into the
// account that is signed in (docs/migration.md), and the outcome afterwards.
// Presentational only: App owns the plan, the call and the result.

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function outcome({ importedSets, importedCards, skipped }) {
  const moved = `${plural(importedSets, "set")} and ${plural(
    importedCards,
    "flashcard"
  )} added to your account.`;

  return skipped > 0
    ? `${moved} ${plural(skipped, "item")} were already there and were left alone.`
    : moved;
}

function ImportDataNotice({ plan, result, busy, onImport }) {
  if (result) {
    return <p className="app-notice">{outcome(result)}</p>;
  }

  if (!plan) return null;

  return (
    <div className="app-notice">
      <p>
        {plural(plan.importable, "set")} in this browser can be added to your
        account ({plural(plan.cardCount, "flashcard")}).
      </p>
      <p className="placeholder-note">
        Your browser copy is left exactly as it is.
        {plan.unclaimed > 0 && " Some were saved before accounts existed."}
        {plan.others > 0 &&
          ` ${plural(plan.others, "set")} belong to another account on this device and stay where they are.`}
      </p>
      <button className="btn btn-primary" onClick={onImport} disabled={busy}>
        {busy ? "Importing…" : `Import ${plural(plan.importable, "set")}`}
      </button>
    </div>
  );
}

export default ImportDataNotice;
