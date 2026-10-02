import { useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import ShareDialog from "./ShareDialog";
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
import { downloadAsFile, loadFromFile, loadFromJSON } from "../canvas/serialize";
import { exportBoardAsPNG, exportBoardAsPDF, autoSave } from "../canvas/export";
import {
  connectSocket,
  disconnectSocket,
  joinRoom,
  listenForConnectionStatus,
  listenForRoomUsers,
  listenForRoomRole,
  listenForRoomKicked,
  listenForStateRequest,
  sendBoardState,
  listenForBoardState,
} from "../socket/socketClient";
import {
  attachCanvasSync,
  broadcastFullBoard,
  getFullBoardState,
  applyRemoteDrawEvent,
} from "../socket/canvasSync";
import { attachCursorSync } from "../socket/cursorSync";

const TOOLS = ["select", "pen", "eraser", "shape", "text"];
const SHAPES = ["rectangle", "circle", "line", "arrow"];

// board = { _id, title, role, canvasJSON } as returned by GET /api/boards/:id
export default function Whiteboard({ board, onBack }) {
  const roomId = board._id; // one Socket.io room per board
  const canvasElRef = useRef(null);
  const containerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const saverRef = useRef(null);
  const roleRef = useRef(board.role);
  // Viewers get the read-only "view" tool, everybody else starts with the pen
  const activeToolRef = useRef(board.role === "viewer" ? "view" : "pen");

  const [role, setRole] = useState(board.role);
  const [activeTool, setActiveToolState] = useState(activeToolRef.current);
  const [activeShape, setActiveShapeState] = useState("rectangle");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(3);
  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [notice, setNotice] = useState("");
  const [showShare, setShowShare] = useState(false);

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

    let cancelled = false;
    const cleanups = []; // everything attached below is detached on unmount

    const handleResize = () => resizeCanvas(canvas, containerRef);
    window.addEventListener("resize", handleResize);
    cleanups.push(() => window.removeEventListener("resize", handleResize));

    const boot = async () => {
      // 1. Put the board saved in MongoDB onto the canvas
      if (board.canvasJSON) {
        const loaded = await loadFromJSON(canvas, board.canvasJSON);
        if (cancelled) return;
        if (!loaded) {
          // Never go live (or auto-save) on top of a board we couldn't read
          setNotice("This board couldn't be loaded, so it was not opened.");
          return;
        }
      }

      setActiveTool(canvas, activeToolRef.current);
      setStrokeColor(canvas, color);
      setStrokeWidth(canvas, width);
      setShapeType(activeShape);
      initHistory(canvas);

      cleanups.push(
        attachDrawingHandlers(
          canvas,
          () => activeToolRef.current,
          handleShapeComplete
        )
      );
      cleanups.push(attachHistoryHandlers(canvas));

      // 2. Real-time collaboration
      connectSocket();
      joinRoom(roomId);
      cleanups.push(listenForConnectionStatus(setConnected));
      cleanups.push(listenForRoomUsers(setUserCount));
      cleanups.push(
        attachCanvasSync(canvas, {
          roomId,
          getActiveTool: () => activeToolRef.current,
        })
      );

      // Live cursors
      cleanups.push(attachCursorSync(containerRef.current));

      // Sync-on-join: answer a new joiner's request for the board,
      // and apply the board a peer sends us when we ARE the new joiner
      cleanups.push(
        listenForStateRequest(({ requesterId }) => {
          const state = getFullBoardState(fabricCanvasRef.current);
          if (state) sendBoardState(requesterId, state);
        })
      );
      cleanups.push(
        listenForBoardState((state) => {
          applyRemoteDrawEvent(
            fabricCanvasRef.current,
            state,
            () => activeToolRef.current
          );
        })
      );

      // 3. Permissions can change while the board is open
      cleanups.push(
        listenForRoomRole(({ role: nextRole }) => {
          const wasViewer = roleRef.current === "viewer";
          const isViewer = nextRole === "viewer";
          roleRef.current = nextRole;
          setRole(nextRole);
          if (wasViewer !== isViewer) handleToolChange(isViewer ? "view" : "select");
        })
      );
      cleanups.push(
        listenForRoomKicked(({ reason }) => {
          roleRef.current = "viewer"; // stops auto-save
          handleToolChange("view");
          setNotice(
            reason === "deleted" || reason === "missing"
              ? "This board no longer exists."
              : "You no longer have access to this board."
          );
        })
      );

      // 4. Auto-save to MongoDB (viewers never save)
      const saver = autoSave(canvas, roomId, {
        canSave: () => roleRef.current !== "viewer",
        onStatus: setSaveStatus,
      });
      saverRef.current = saver;

      const handlePageHide = () => saver.saveNow({ closing: true });
      window.addEventListener("pagehide", handlePageHide);
      cleanups.push(() => {
        window.removeEventListener("pagehide", handlePageHide);
        saver.saveNow(); // last save: serializes right now, before the canvas is disposed
        saver.stop();
        saverRef.current = null;
      });
    };

    boot();

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
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

  const handleSave = () => saverRef.current?.saveNow();

  const handleExportJSON = () => downloadAsFile(fabricCanvasRef.current);
  const handleExportPNG = () => exportBoardAsPNG(fabricCanvasRef.current, board.title);
  const handleExportPDF = () =>
    exportBoardAsPDF(fabricCanvasRef.current, board.title).catch((err) => {
      console.error("PDF export failed:", err);
      window.alert("Could not create the PDF.");
    });

  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFromFile(fabricCanvasRef.current, file, afterLoad);
    e.target.value = "";
  };

  return (
    <div className="whiteboard-wrapper">
      <Toolbar
        title={board.title}
        role={role}
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
        saveStatus={saveStatus}
        onExportJSON={handleExportJSON}
        onImport={handleImportClick}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        connected={connected}
        userCount={userCount}
        onShare={() => setShowShare(true)}
        onBack={onBack}
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

      {showShare && role === "owner" && (
        <ShareDialog boardId={roomId} onClose={() => setShowShare(false)} />
      )}

      {notice && (
        <div className="whiteboard-notice">
          <div className="whiteboard-notice-box">
            <p>{notice}</p>
            <button type="button" onClick={onBack}>
              Back to my boards
            </button>
          </div>
        </div>
      )}
    </div>
  );
}