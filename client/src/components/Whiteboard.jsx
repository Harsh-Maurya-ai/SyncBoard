import { useEffect, useRef, useState } from "react";
import { initCanvas, resizeCanvas, setActiveTool } from "../canvas/canvasSetup";
import {
  attachDrawingHandlers,
  setStrokeColor,
  setStrokeWidth,
  setShapeType,
} from "../canvas/drawingTools";
import {
  initHistory,
  attachHistoryHandlers,
  undo,
  redo,
  clearCanvas,
} from "../canvas/history";
import {
  exportToJSON,
  loadFromJSON,
  saveToLocalStorage,
  loadFromLocalStorage,
  downloadAsFile,
  loadFromFile,
} from "../canvas/serialize";

const TOOLS = ["select", "pen", "eraser", "shape", "text"];
const SHAPES = ["rectangle", "circle", "line", "arrow"];

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "#1e1e1e",
    borderBottom: "1px solid #333",
    flexWrap: "wrap",
  },
  toolBtn: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #444",
    background: "#2a2a2a",
    color: "#ddd",
    textTransform: "capitalize",
    cursor: "pointer",
    fontSize: 14,
  },
  toolBtnActive: {
    background: "#4f7cff",
    borderColor: "#4f7cff",
    color: "#fff",
  },
  actionBtn: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #444",
    background: "#333",
    color: "#ddd",
    cursor: "pointer",
    fontSize: 14,
  },
  select: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #444",
    background: "#2a2a2a",
    color: "#ddd",
    fontSize: 14,
  },
  colorInput: {
    width: 36,
    height: 32,
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  widthInput: {
    width: 100,
  },
  divider: {
    width: 1,
    height: 24,
    background: "#444",
  },
  canvasContainer: {
    flex: 1,
    position: "relative",
    background: "#f4f4f4",
  },
};

export default function Whiteboard() {
  const canvasElRef = useRef(null);
  const containerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const activeToolRef = useRef("pen");
  const fileInputRef = useRef(null);

  const [activeTool, setActiveToolState] = useState("pen");
  const [activeShape, setActiveShapeState] = useState("rectangle");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(3);

  useEffect(() => {
    const canvas = initCanvas(canvasElRef, containerRef);
    fabricCanvasRef.current = canvas;
    setActiveTool(canvas, activeToolRef.current);
    setStrokeColor(canvas, color);
    setStrokeWidth(canvas, width);
    setShapeType(activeShape);
    initHistory(canvas);

    const detachDrawingHandlers = attachDrawingHandlers(
      canvas,
      () => activeToolRef.current
    );
    const detachHistoryHandlers = attachHistoryHandlers(canvas);

    const handleResize = () => resizeCanvas(canvas, containerRef);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      detachDrawingHandlers();
      detachHistoryHandlers();
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  const handleToolChange = (tool) => {
    setActiveToolState(tool);
    activeToolRef.current = tool;
    setActiveTool(fabricCanvasRef.current, tool);
  };

  const handleShapeChange = (e) => {
    setActiveShapeState(e.target.value);
    setShapeType(e.target.value);
  };

  const handleColorChange = (e) => {
    setColor(e.target.value);
    setStrokeColor(fabricCanvasRef.current, e.target.value);
  };

  const handleWidthChange = (e) => {
    const value = Number(e.target.value);
    setWidth(value);
    setStrokeWidth(fabricCanvasRef.current, value);
  };

  const handleUndo = () => undo(fabricCanvasRef.current);
  const handleRedo = () => redo(fabricCanvasRef.current);
  const handleClear = () => clearCanvas(fabricCanvasRef.current);

  const handleSave = () => saveToLocalStorage(fabricCanvasRef.current);
  const handleLoad = () => loadFromLocalStorage(fabricCanvasRef.current);

  const handleExport = () => downloadAsFile(fabricCanvasRef.current);
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFromFile(fabricCanvasRef.current, file);
    e.target.value = "";
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        {TOOLS.map((tool) => (
          <button
            key={tool}
            style={
              activeTool === tool
                ? { ...styles.toolBtn, ...styles.toolBtnActive }
                : styles.toolBtn
            }
            onClick={() => handleToolChange(tool)}
          >
            {tool}
          </button>
        ))}

        {activeTool === "shape" && (
          <select
            style={styles.select}
            value={activeShape}
            onChange={handleShapeChange}
          >
            {SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {shape}
              </option>
            ))}
          </select>
        )}

        <input
          type="color"
          style={styles.colorInput}
          value={color}
          onChange={handleColorChange}
        />

        <input
          type="range"
          min="1"
          max="30"
          style={styles.widthInput}
          value={width}
          onChange={handleWidthChange}
        />

        <div style={styles.divider} />

        <button style={styles.actionBtn} onClick={handleUndo}>
          Undo
        </button>
        <button style={styles.actionBtn} onClick={handleRedo}>
          Redo
        </button>
        <button style={styles.actionBtn} onClick={handleClear}>
          Clear
        </button>

        <div style={styles.divider} />

        <button style={styles.actionBtn} onClick={handleSave}>
          Save
        </button>
        <button style={styles.actionBtn} onClick={handleLoad}>
          Load
        </button>
        <button style={styles.actionBtn} onClick={handleExport}>
          Export
        </button>
        <button style={styles.actionBtn} onClick={handleImportClick}>
          Import
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleImportFile}
        />
      </div>

      <div style={styles.canvasContainer} ref={containerRef}>
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}