import { useState } from "react";
import "./Toolbar.css";

const PRESET_COLORS = [
  "#000000",
  "#e03131",
  "#f08c00",
  "#2f9e44",
  "#1971c2",
  "#9c36b5",
];

function Divider() {
  return <div className="toolbar-divider" />;
}

export default function Toolbar({
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
  onLoad,
  onExportJSON,
  onImport,
  onExportPNG,
  connected,
  userCount,
  onCopyLink,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await onCopyLink();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Could not copy link:", err);
    }
  };

  return (
    <div className="toolbar">
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

      <Divider />

      {/* Save / load / export */}
      <div className="toolbar-group">
        <button type="button" className="toolbar-action-btn" onClick={onSave}>
          Save
        </button>
        <button type="button" className="toolbar-action-btn" onClick={onLoad}>
          Load
        </button>
        <button
          type="button"
          className="toolbar-action-btn"
          onClick={onExportJSON}
        >
          Export JSON
        </button>
        <button
          type="button"
          className="toolbar-action-btn"
          onClick={onImport}
        >
          Import
        </button>
        <button
          type="button"
          className="toolbar-action-btn primary"
          onClick={onExportPNG}
        >
          Export PNG
        </button>
      </div>

      <div className="toolbar-spacer" />

      {/* Collaboration status */}
      <div className="toolbar-group">
        <span className={`toolbar-status${connected ? " online" : ""}`}>
          <span className="toolbar-status-dot" />
          {connected ? `Live · ${userCount} online` : "Offline"}
        </span>
        <button
          type="button"
          className="toolbar-action-btn"
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}