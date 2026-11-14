import "./StatusBar.css";
import ZoomControl from "./ZoomControl";

const SAVE_LABELS = {
  saved: "All changes saved",
  saving: "Saving…",
  error: "Save failed, retrying…",
};

// Bottom bar: live connection on the left, auto-save status and zoom on the right
export default function StatusBar({
  connected,
  userCount,
  saveStatus,
  canEdit,
  zoom,
  onZoomChange,
}) {
  return (
    <div className="status-bar">
      <span className={`status-live${connected ? " online" : ""}`}>
        <span className="status-live-dot" />
        {connected ? `Live · ${userCount} online` : "Offline"}
      </span>

      <div className="status-spacer" />

      {canEdit && (
        <span className={`status-save ${saveStatus}`}>
          {SAVE_LABELS[saveStatus]}
        </span>
      )}

      <ZoomControl zoom={zoom} onZoomChange={onZoomChange} />
    </div>
  );
}