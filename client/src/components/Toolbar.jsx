import "./Toolbar.css";
import Icon from "./Icons";

const PRESET_COLORS = [
  "#000000",
  "#e03131",
  "#f08c00",
  "#2f9e44",
  "#1971c2",
  "#9c36b5",
];

// Which icon each tool uses
const TOOL_ICONS = {
  select: "select",
  hand: "hand",
  pen: "pen",
  eraser: "eraser",
  shape: "shape",
  text: "text",
};

// Tooltip text for each tool
const TOOL_TITLES = {
  select: "Select tool",
  hand: "Hand tool (move around the board)",
  pen: "Pen tool",
  eraser: "Eraser tool",
  shape: "Shape tool",
  text: "Text tool",
};

// One ribbon section: buttons on top, small label underneath (like Paint)
function Group({ label, children }) {
  return (
    <div className="toolbar-group">
      <div className="toolbar-group-body">{children}</div>
      <div className="toolbar-group-label">{label}</div>
    </div>
  );
}

// Icon + text button. On phones the text is hidden (icon only).
function ActionButton({ icon, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`toolbar-action-btn ${className}`}
      title={children}
      aria-label={children}
      {...props}
    >
      <Icon name={icon} size={16} />
      <span className="toolbar-btn-text">{children}</span>
    </button>
  );
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
  onUndo,
  onRedo,
  onClear,
  onSave,
  onExportJSON,
  onImport,
  onExportPNG,
  onExportPDF,
  onShare,
  onBack,
  chatOpen,
  chatUnread,
  onToggleChat,
}) {
  const canEdit = role !== "viewer";
  const isOwner = role === "owner";

  return (
    <div className="toolbar">
      {/* Top menu row */}
      <div className="toolbar-menu">
        <ActionButton icon="back" onClick={onBack}>
          Boards
        </ActionButton>
        <span className="toolbar-title" title={title}>
          {title}
        </span>
        <span className={`toolbar-role ${role}`}>{canEdit ? role : "view only"}</span>

        <div className="toolbar-spacer" />

        <button
          type="button"
          title="Chat"
          aria-label="Chat"
          className={`toolbar-action-btn chat-toggle-btn${chatOpen ? " active" : ""}`}
          onClick={onToggleChat}
        >
          <Icon name="chat" size={16} />
          <span className="toolbar-btn-text">Chat</span>
          {chatUnread > 0 && (
            <span className="chat-unread-badge">
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          )}
        </button>

        {isOwner && (
          <ActionButton icon="share" className="share" onClick={onShare}>
            Share
          </ActionButton>
        )}
      </div>

      {/* Ribbon */}
      <div className="toolbar-ribbon">
        {canEdit && (
          <>
            <Group label="Tools">
              {tools.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  aria-pressed={activeTool === tool}
                  aria-label={TOOL_TITLES[tool] || `${tool} tool`}
                  title={TOOL_TITLES[tool] || `${tool} tool`}
                  className={`toolbar-icon-btn${activeTool === tool ? " active" : ""}`}
                  onClick={() => onToolChange(tool)}
                >
                  <Icon name={TOOL_ICONS[tool] || "select"} size={20} />
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
            </Group>

            <Group label="Colors">
              <input
                type="color"
                title="Custom color"
                className="toolbar-color-input"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
              />
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
            </Group>

            <Group label="History">
              <button
                type="button"
                className="toolbar-icon-btn"
                title="Undo"
                aria-label="Undo"
                onClick={onUndo}
              >
                <Icon name="undo" size={20} />
              </button>
              <button
                type="button"
                className="toolbar-icon-btn"
                title="Redo"
                aria-label="Redo"
                onClick={onRedo}
              >
                <Icon name="redo" size={20} />
              </button>
              <button
                type="button"
                className="toolbar-icon-btn danger"
                title="Clear board"
                aria-label="Clear board"
                onClick={onClear}
              >
                <Icon name="trash" size={20} />
              </button>
            </Group>
          </>
        )}

        <Group label="File">
          {canEdit && (
            <>
              <ActionButton icon="save" onClick={onSave}>
                Save
              </ActionButton>
              <ActionButton icon="upload" onClick={onImport}>
                Import
              </ActionButton>
            </>
          )}
          <ActionButton icon="json" onClick={onExportJSON}>
            JSON
          </ActionButton>
          <ActionButton icon="image" className="primary" onClick={onExportPNG}>
            PNG
          </ActionButton>
          <ActionButton icon="pdf" className="primary" onClick={onExportPDF}>
            PDF
          </ActionButton>
        </Group>
      </div>
    </div>
  );
}