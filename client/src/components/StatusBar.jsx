import "./StatusBar.css";

const SAVE_LABELS = {
  saved: "All changes saved",
  saving: "Saving…",
  error: "Save failed, retrying…",
};

// Bottom bar: live connection on the left, auto-save status on the right
export default function StatusBar({ connected, userCount, saveStatus, canEdit }) {
  return (
    <div className="status-bar">
      <span className={`status-live${connected ? " online" : ""}`}>
        <span className="status-live-dot" />
        {connected ? `Live · ${userCount} online` : "Offline"}
      </span>

      {canEdit && (
        <span className={`status-save ${saveStatus}`}>
          {SAVE_LABELS[saveStatus]}
        </span>
      )}
    </div>
  );
}