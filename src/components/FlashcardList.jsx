import "./FlashcardList.css";

function FlashcardList({ cards, onEdit, onDelete }) {
  return (
    <ul className="flashcard-list">
      {cards.map((card) => (
        <li key={card.id} className="flashcard-row">
          <div className="flashcard-row-text">
            <div className="flashcard-row-heading">
              <p className="flashcard-term">{card.term}</p>
              {card.learningStatus && (
                <span className={`card-status card-status-${card.learningStatus}`}>
                  {card.learningStatus === "known" ? "I know this" : "Still learning"}
                </span>
              )}
            </div>
            <p className="flashcard-definition">{card.definition}</p>
          </div>
          <div className="flashcard-row-actions">
            <button className="btn-text" onClick={() => onEdit(card)}>
              Edit
            </button>
            <button
              className="btn-text btn-text-danger"
              onClick={() => onDelete(card.id)}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default FlashcardList;
