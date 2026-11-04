import "./SizeRail.css";

// Vertical stroke-width slider (left side of the canvas, like Paint)
export default function SizeRail({ width, color, onWidthChange }) {
  return (
    <div className="size-rail" title="Stroke width">
      <div className="size-rail-preview">
        <span
          className="size-rail-dot"
          style={{ width, height: width, background: color }}
        />
      </div>

      <input
        type="range"
        min="1"
        max="30"
        aria-label="Stroke width"
        className="size-rail-slider"
        value={width}
        onChange={(e) => onWidthChange(Number(e.target.value))}
      />

      <span className="size-rail-value">{width}px</span>
    </div>
  );
}