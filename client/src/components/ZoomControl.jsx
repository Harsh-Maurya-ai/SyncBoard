import "./ZoomControl.css";
import Icon from "./Icons";
import { MIN_ZOOM, MAX_ZOOM, stepZoom } from "../canvas/zoom";

// Bottom-right zoom bar: zoom out / slider / zoom in / percentage (click = 100%)
export default function ZoomControl({ zoom, onZoomChange }) {
  const percent = Math.round(zoom * 100);

  return (
    <div className="zoom-control">
      <button
        type="button"
        className="zoom-btn"
        title="Zoom out"
        aria-label="Zoom out"
        disabled={zoom <= MIN_ZOOM + 0.001}
        onClick={() => onZoomChange(stepZoom(zoom, -1))}
      >
        <Icon name="zoomOut" size={18} />
      </button>

      <input
        type="range"
        className="zoom-slider"
        aria-label="Zoom"
        min={Math.round(MIN_ZOOM * 100)}
        max={Math.round(MAX_ZOOM * 100)}
        step="5"
        value={percent}
        onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
      />

      <button
        type="button"
        className="zoom-btn"
        title="Zoom in"
        aria-label="Zoom in"
        disabled={zoom >= MAX_ZOOM - 0.001}
        onClick={() => onZoomChange(stepZoom(zoom, 1))}
      >
        <Icon name="zoomIn" size={18} />
      </button>

      <button
        type="button"
        className="zoom-percent"
        title="Reset to 100%"
        onClick={() => onZoomChange(1)}
      >
        {percent}%
      </button>
    </div>
  );
}