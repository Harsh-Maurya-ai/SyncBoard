import "./Toolbar.css";

const PRESET_COLORS = [
  "#000000",
  "#e03131",
  "#f08c00",
  "#2f9e44",
  "#1971c2",
  "#9c36b5",
];

const SAVE_LABELS = {
  saved: "All changes saved",
  saving: "Saving…",
  error: "Save failed, retrying…",
};

function Divider() {
  return <div className="toolbar-divider" />;
}

export default function Toolbar({
  title,
  role,
  tools,
  activeTool,
  onToolChange,
  shapes,
  activeShape,
  onShapeChange,
  color,
  onColorChange,
  width,
  onWidthChange,
  onUndo,
  onRedo,
  onClear,
  onSave,
  saveStatus,
  onExportJSON,
  onImport,
  onExportPNG,
  onExportPDF,
  connected,
  userCount,
  onShare,
  onBack,
}) {
  const canEdit = role !== "viewer";
  const isOwner = role === "owner";

  return (
    <div className="toolbar">
      {/* Board */}
      <div className="toolbar-group">
        <button type="button" className="toolbar-action-btn" onClick={onBack}>
          ← Boards
        </button>
        <span className="toolbar-title" title={title}>
          {title}
        </span>
        <span className={`toolbar-role ${role}`}>{canEdit ? role : "view only"}</span>
      </div>

      {canEdit && (
        <>
          <Divider />

          {/* Tools */}
          <div className="toolbar-group">
            {tools.map((tool) => (
              <button
                key={tool}
                type="button"
                aria-pressed={activeTool === tool}
                title={`${tool} tool`}
                className={`toolbar-tool-btn${activeTool === tool ? " active" : ""}`}
                onClick={() => onToolChange(tool)}
              >
                {tool}
              </button>
            ))}

            {activeTool === "shape" && (
              <select
                className="toolbar-select"
                value={activeShape}
                onChange={(e) => onShapeChange(e.target.value)}
                title="Shape type"
              >
                {shapes.map((shape) => (
                  <option key={shape} value={shape}>
                    {shape}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Divider />

          {/* Color */}
          <div className="toolbar-group">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                title={preset}
                aria-label={`Use color ${preset}`}
                className={`toolbar-swatch${
                  color.toLowerCase() === preset ? " active" : ""
                }`}
                style={{ background: preset }}
                onClick={() => onColorChange(preset)}
              />
            ))}

            <input
              type="color"
              title="Custom color"
              className="toolbar-color-input"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
            />
          </div>

          {/* Stroke width */}
          <div className="toolbar-group">
            <input
              type="range"
              min="1"
              max="30"
              title="Stroke width"
              className="toolbar-width-input"
              value={width}
              onChange={(e) => onWidthChange(Number(e.target.value))}
            />
            <span className="toolbar-width-label">{width}px</span>
            <div className="toolbar-preview" title="Brush preview">
              <div
                className="toolbar-preview-dot"
                style={{ width, height: width, background: color }}
              />
            </div>
          </div>

          <Divider />

          {/* History */}
          <div className="toolbar-group">
            <button type="button" className="toolbar-action-btn" onClick={onUndo}>
              Undo
            </button>
            <button type="button" className="toolbar-action-btn" onClick={onRedo}>
              Redo
            </button>
            <button
              type="button"
              className="toolbar-action-btn danger"
              onClick={onClear}
            >
              Clear
            </button>
          </div>
        </>
      )}

      <Divider />

      {/* Save / export */}
      <div className="toolbar-group">
        {canEdit && (
          <>
            <button type="button" className="toolbar-action-btn" onClick={onSave}>
              Save
            </button>
            <span className={`toolbar-save-status ${saveStatus}`}>
              {SAVE_LABELS[saveStatus]}
            </span>
          </>
        )}
        <button
          type="button"
          className="toolbar-action-btn"
          onClick={onExportJSON}
        >
          Export JSON
        </button>
        {canEdit && (
          <button
            type="button"
            className="toolbar-action-btn"
            onClick={onImport}
          >
            Import
          </button>
        )}
        <button
          type="button"
          className="toolbar-action-btn primary"
          onClick={onExportPNG}
        >
          Export PNG
        </button>
        <button
          type="button"
          className="toolbar-action-btn primary"
          onClick={onExportPDF}
        >
          Export PDF
        </button>
      </div>

      <div className="toolbar-spacer" />

      {/* Collaboration status */}
      <div className="toolbar-group">
        <span className={`toolbar-status${connected ? " online" : ""}`}>
          <span className="toolbar-status-dot" />
          {connected ? `Live · ${userCount} online` : "Offline"}
        </span>
        {isOwner && (
          <button
            type="button"
            className="toolbar-action-btn share"
            onClick={onShare}
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}