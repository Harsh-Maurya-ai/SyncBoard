import { Canvas, PencilBrush, IText, ActiveSelection } from "fabric";

// The drawing area has a fixed size, bigger than most screens, so the board
// can be scrolled horizontally and vertically (everyone sees the same board)
export const BOARD_WIDTH = 2400;
export const BOARD_HEIGHT = 1600;

// instanceof works in every Fabric version (obj.type is deprecated and may be missing in v7)
export function isTextObject(obj) {
  return obj instanceof IText;
}

export function isActiveSelection(obj) {
  return obj instanceof ActiveSelection;
}

export function initCanvas(canvasElRef) {
  const canvas = new Canvas(canvasElRef.current, {
    isDrawingMode: false,
    backgroundColor: "#ffffff",
    selection: true,
    preserveObjectStacking: true,
  });

  canvas.setDimensions({ width: BOARD_WIDTH, height: BOARD_HEIGHT });

  canvas.freeDrawingBrush = new PencilBrush(canvas);
  canvas.freeDrawingBrush.width = 3;
  canvas.freeDrawingBrush.color = "#000000";

  return canvas;
}

export function setActiveTool(canvas, toolName) {
  if (!canvas) return;

  // Leaving Select: drop the current selection (also finishes any text editing)
  if (toolName !== "select") canvas.discardActiveObject();

  switch (toolName) {
    case "pen":
      canvas.isDrawingMode = true;
      canvas.selection = false;
      break;

    case "eraser":
    case "shape":
    case "text":
    case "hand": // pan the board (finger on touch screens, drag with the mouse)
    case "view": // read-only mode for viewers: look, but don't touch
      canvas.isDrawingMode = false;
      canvas.selection = false;
      break;

    case "select":
    default:
      canvas.isDrawingMode = false;
      canvas.selection = true;
      break;
  }

  // On touch screens a finger on the canvas normally draws. In Hand / View mode
  // we let the browser scroll the board instead.
  const touchScroll = toolName === "hand" || toolName === "view";
  canvas.allowTouchScrolling = touchScroll;
  if (canvas.upperCanvasEl) {
    canvas.upperCanvasEl.style.touchAction = touchScroll ? "pan-x pan-y" : "none";
  }
  canvas.defaultCursor = toolName === "hand" ? "grab" : "default";

  canvas.forEachObject((obj) => {
    // In the Text tool, existing text stays clickable so it can be edited
    const interactive =
      toolName === "select" || (toolName === "text" && isTextObject(obj));
    obj.selectable = interactive;
    obj.evented = interactive;
  });

  canvas.requestRenderAll();
}

// Hand tool with a mouse: drag on the board to scroll it.
// (Touch screens scroll natively, see setActiveTool.)
// Returns a cleanup function.
export function attachPanHandlers(canvas, containerRef, getActiveTool) {
  let start = null;

  const isMouseLike = (e) =>
    typeof e?.clientX === "number" && (!e.pointerType || e.pointerType === "mouse");

  const onMouseDown = (opt) => {
    if (getActiveTool() !== "hand") return;
    const container = containerRef.current;
    const e = opt.e;
    if (!container || !isMouseLike(e)) return;

    start = {
      x: e.clientX,
      y: e.clientY,
      left: container.scrollLeft,
      top: container.scrollTop,
    };
  };

  const onMouseMove = (opt) => {
    if (!start) return;
    const container = containerRef.current;
    const e = opt.e;
    if (!container || !isMouseLike(e)) return;

    container.scrollLeft = start.left - (e.clientX - start.x);
    container.scrollTop = start.top - (e.clientY - start.y);
  };

  const onMouseUp = () => {
    start = null;
  };

  // Keep Fabric's pointer math right after the board is scrolled (older Fabric versions)
  const onScroll = () => canvas.calcOffset?.();
  const container = containerRef.current;
  container?.addEventListener("scroll", onScroll, { passive: true });

  canvas.on("mouse:down", onMouseDown);
  canvas.on("mouse:move", onMouseMove);
  canvas.on("mouse:up", onMouseUp);

  return () => {
    container?.removeEventListener("scroll", onScroll);
    canvas.off("mouse:down", onMouseDown);
    canvas.off("mouse:move", onMouseMove);
    canvas.off("mouse:up", onMouseUp);
  };
}