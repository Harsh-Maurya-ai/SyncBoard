// Spinner + bouncing dots. Styles live in public/loader.css
// (that file is loaded from index.html so the loader also shows before React starts).
export default function Loader({ text = "Loading", fullScreen = true }) {
  return (
    <div
      className={`sb-loader${fullScreen ? " sb-loader-full" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="sb-spinner" />
      <div className="sb-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="sb-loader-text">{text}</p>
    </div>
  );
}