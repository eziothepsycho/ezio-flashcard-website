import "./SetCard.css";

function SetCard({ set, index, onOpen, onEdit, onDelete }) {
  return (
    <div className={`set-card set-card-tilt-${index % 3}`}>
      <button className="set-card-body" onClick={onOpen}>
        <h3 className="set-card-title">{set.title}</h3>
        {set.description && (
          <p className="set-card-description">{set.description}</p>
        )}
      </button>
      <div className="set-card-actions">
        <button className="btn-text" onClick={onEdit}>
          Edit
        </button>
        <button className="btn-text btn-text-danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default SetCard;