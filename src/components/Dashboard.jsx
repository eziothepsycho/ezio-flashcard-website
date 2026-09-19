import "./Dashboard.css";
import SetCard from "./SetCard";

function Dashboard({ sets, onOpenSet, onCreateSet, onEditSet, onDeleteSet }) {
  return (
    <div className="dashboard">
      <div className="dashboard-toolbar">
        <h2>Your sets</h2>
        <button className="btn btn-primary" onClick={onCreateSet}>
          New set
        </button>
      </div>

      {sets.length === 0 ? (
        <div className="empty-state">
          <p>No flashcard sets yet.</p>
          <p className="empty-state-note">Create one to get started.</p>
        </div>
      ) : (
        <div className="set-grid">
          {sets.map((set, i) => (
            <SetCard
              key={set.id}
              set={set}
              index={i}
              onOpen={() => onOpenSet(set.id)}
              onEdit={() => onEditSet(set)}
              onDelete={() => onDeleteSet(set.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;