import { useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import "./Whiteboard.css";
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
  pushToHistory,
} from "../canvas/history";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  downloadAsFile,
  loadFromFile,
} from "../canvas/serialize";
import { exportAsPNG } from "../canvas/export";
import {
  connectSocket,
  disconnectSocket,
  joinRoom,
  getRoomId,
  listenForConnectionStatus,
  listenForRoomUsers,
} from "../socket/socketClient";
import { attachCanvasSync, broadcastFullBoard } from "../socket/canvasSync";

const TOOLS = ["select", "pen", "eraser", "shape", "text"];
const SHAPES = ["rectangle", "circle", "line", "arrow"];

export default function Whiteboard() {
  const canvasElRef = useRef(null);
  const containerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const activeToolRef = useRef("pen");
  const fileInputRef = useRef(null);

  const [roomId] = useState(getRoomId);
  const [activeTool, setActiveToolState] = useState("pen");
  const [activeShape, setActiveShapeState] = useState("rectangle");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(3);
  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);

  const handleToolChange = (tool) => {
    setActiveToolState(tool);
    activeToolRef.current = tool;
    setActiveTool(fabricCanvasRef.current, tool);
  };

  // After a shape is drawn: switch to Select and keep the shape selected,
  // so it can be moved / resized / rotated right away
  const handleShapeComplete = (shape) => {
    handleToolChange("select");
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setActiveObject(shape);
    canvas.requestRenderAll();
  };

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
      () => activeToolRef.current,
      handleShapeComplete
    );
    const detachHistoryHandlers = attachHistoryHandlers(canvas);

    // Real-time collaboration
    connectSocket();
    joinRoom(roomId);
    const detachStatus = listenForConnectionStatus(setConnected);
    const detachUsers = listenForRoomUsers(setUserCount);
    const detachSync = attachCanvasSync(canvas, {
      roomId,
      getActiveTool: () => activeToolRef.current,
    });

    const handleResize = () => resizeCanvas(canvas, containerRef);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      detachDrawingHandlers();
      detachHistoryHandlers();
      detachSync();
      detachStatus();
      detachUsers();
      disconnectSocket();
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  const handleShapeChange = (shape) => {
    setActiveShapeState(shape);
    setShapeType(shape);
  };

  const handleColorChange = (value) => {
    setColor(value);
    setStrokeColor(fabricCanvasRef.current, value);
  };

  const handleWidthChange = (value) => {
    setWidth(value);
    setStrokeWidth(fabricCanvasRef.current, value);
  };

  // Objects are rebuilt after undo/redo/load, so re-apply the active tool
  const reapplyTool = () =>
    setActiveTool(fabricCanvasRef.current, activeToolRef.current);

  // Send the whole board to collaborators
  const syncBoard = () => broadcastFullBoard(fabricCanvasRef.current, roomId);

  const afterRestore = () => {
    reapplyTool();
    syncBoard();
  };

  const afterLoad = () => {
    reapplyTool();
    pushToHistory(fabricCanvasRef.current);
    syncBoard();
  };

  const handleUndo = () => undo(fabricCanvasRef.current, afterRestore);
  const handleRedo = () => redo(fabricCanvasRef.current, afterRestore);
  const handleClear = () => {
    clearCanvas(fabricCanvasRef.current);
    syncBoard();
  };

  const handleSave = () => saveToLocalStorage(fabricCanvasRef.current);
  const handleLoad = () => loadFromLocalStorage(fabricCanvasRef.current, afterLoad);

  const handleExportJSON = () => downloadAsFile(fabricCanvasRef.current);
  const handleExportPNG = () => exportAsPNG(fabricCanvasRef.current);

  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFromFile(fabricCanvasRef.current, file, afterLoad);
    e.target.value = "";
  };

  const handleCopyLink = () => navigator.clipboard.writeText(window.location.href);

  return (
    <div className="whiteboard-wrapper">
      <Toolbar
        tools={TOOLS}
        activeTool={activeTool}
        onToolChange={handleToolChange}
        shapes={SHAPES}
        activeShape={activeShape}
        onShapeChange={handleShapeChange}
        color={color}
        onColorChange={handleColorChange}
        width={width}
        onWidthChange={handleWidthChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSave={handleSave}
        onLoad={handleLoad}
        onExportJSON={handleExportJSON}
        onImport={handleImportClick}
        onExportPNG={handleExportPNG}
        connected={connected}
        userCount={userCount}
        onCopyLink={handleCopyLink}
      />

      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        hidden
        onChange={handleImportFile}
      />

      <div className="whiteboard-canvas-container" ref={containerRef}>
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}