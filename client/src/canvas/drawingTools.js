import { Rect, Circle, Line, IText, Triangle, Group, Point } from "fabric";
import { pushToHistory } from "./history";
import { isTextObject } from "./canvasSetup";

let isDrawing = false;
let startPoint = null;
let activeShape = null;
let currentShapeType = "rectangle";
let currentStrokeColor = "#000000";
let currentStrokeWidth = 3;
let clickEndedEditing = false; // true when a click just finished editing a text box

// Fabric 6+/7 use getScenePoint; older versions use getPointer
function getPoint(canvas, opt) {
  if (typeof canvas.getScenePoint === "function") {
    return canvas.getScenePoint(opt.e);
  }
  return canvas.getPointer(opt.e);
}

export function setStrokeColor(canvas, color) {
  currentStrokeColor = color;
  if (canvas?.freeDrawingBrush) {
    canvas.freeDrawingBrush.color = color;
  }
}

export function setStrokeWidth(canvas, width) {
  currentStrokeWidth = width;
  if (canvas?.freeDrawingBrush) {
    canvas.freeDrawingBrush.width = width;
  }
}

export function setShapeType(shapeType) {
  currentShapeType = shapeType;
}

export function drawFreehand(canvas) {
  canvas.isDrawingMode = true;
  canvas.freeDrawingBrush.color = currentStrokeColor;
  canvas.freeDrawingBrush.width = currentStrokeWidth;
}

function createShape(shapeType, start, end) {
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);

  const commonProps = {
    stroke: currentStrokeColor,
    strokeWidth: currentStrokeWidth,
    fill: "transparent",
    selectable: false,
    evented: false,
  };

  switch (shapeType) {
    case "circle": {
      const radius = Math.sqrt(width * width + height * height) / 2;
      return new Circle({ ...commonProps, left, top, radius });
    }
    case "line": {
      return new Line([start.x, start.y, end.x, end.y], commonProps);
    }
    case "arrow": {
      const line = new Line([start.x, start.y, end.x, end.y], commonProps);
      const angle =
        Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) + 90;
      const head = new Triangle({
        left: end.x,
        top: end.y,
        originX: "center",
        originY: "center",
        angle,
        width: currentStrokeWidth * 5,
        height: currentStrokeWidth * 5,
        fill: currentStrokeColor,
        stroke: currentStrokeColor,
        selectable: false,
        evented: false,
      });
      return new Group([line, head], { selectable: false, evented: false });
    }
    case "rectangle":
    default:
      return new Rect({ ...commonProps, left, top, width, height });
  }
}

export function drawShape(canvas, shapeType, start, end) {
  return createShape(shapeType, start, end);
}

function updateShapeGeometry(canvas, shape, shapeType, start, end) {
  if (shapeType === "rectangle" || shapeType === "circle") {
    canvas.remove(shape);
    const updated = createShape(shapeType, start, end);
    canvas.add(updated);
    return updated;
  }

  if (shapeType === "line") {
    shape.set({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    shape.setCoords();
    return shape;
  }

  canvas.remove(shape);
  const updated = createShape(shapeType, start, end);
  canvas.add(updated);
  return updated;
}

export function addTextBox(canvas, position) {
  // Starts empty (no placeholder text to delete) and is ready for typing
  const text = new IText("", {
    left: position.x,
    top: position.y,
    fontSize: 20,
    fill: currentStrokeColor,
  });

  // If the user clicks away without typing anything, remove the empty box
  text.on("editing:exited", () => {
    const isEmpty = !text.text || text.text.trim() === "";
    if (isEmpty && !text.id) {
      canvas.remove(text);
      canvas.requestRenderAll();
    }
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  text.enterEditing();
  return text;
}

export function eraseObjectAt(canvas, position) {
  const objects = canvas.getObjects();
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj.containsPoint(new Point(position.x, position.y))) {
      canvas.remove(obj);
      canvas.requestRenderAll();
      pushToHistory(canvas);
      break;
    }
  }
}

export function handleMouseDown(canvas, opt, toolName) {
  if (toolName === "eraser") {
    eraseObjectAt(canvas, getPoint(canvas, opt));
    return;
  }

  if (toolName === "text") {
    // This click only finished editing another text box: don't start a new one
    if (clickEndedEditing) {
      clickEndedEditing = false;
      return;
    }
    // Click on existing text: let Fabric select / edit it
    if (opt.target && isTextObject(opt.target)) return;

    addTextBox(canvas, getPoint(canvas, opt));
    return;
  }

  if (toolName !== "shape") return;

  isDrawing = true;
  startPoint = getPoint(canvas, opt);
  activeShape = createShape(currentShapeType, startPoint, startPoint);
  canvas.add(activeShape);
}

export function handleMouseMove(canvas, opt, toolName) {
  if (toolName !== "shape" || !isDrawing || !activeShape) return;

  const pointer = getPoint(canvas, opt);
  activeShape = updateShapeGeometry(
    canvas,
    activeShape,
    currentShapeType,
    startPoint,
    pointer
  );
  canvas.requestRenderAll();
}

export function handleMouseUp(canvas, toolName, onShapeComplete) {
  if (toolName !== "shape" || !activeShape) return;

  const finished = activeShape;
  isDrawing = false;
  activeShape = null;
  startPoint = null;

  // A plain click without dragging makes an empty shape: discard it
  if ((finished.width || 0) < 3 && (finished.height || 0) < 3) {
    canvas.remove(finished);
    canvas.requestRenderAll();
    return;
  }

  finished.set({ selectable: true, evented: true });
  canvas.requestRenderAll();
  pushToHistory(canvas);

  // Lets the UI switch to the Select tool and select this shape
  if (onShapeComplete) onShapeComplete(finished);
}

export function attachDrawingHandlers(canvas, getActiveTool, onShapeComplete) {
  // Runs before Fabric processes the click: remember if a text box was being edited
  const onMouseDownBefore = () => {
    const active = canvas.getActiveObject();
    clickEndedEditing = Boolean(active && active.isEditing);
  };
  const onMouseDown = (opt) => handleMouseDown(canvas, opt, getActiveTool());
  const onMouseMove = (opt) => handleMouseMove(canvas, opt, getActiveTool());
  const onMouseUp = () => handleMouseUp(canvas, getActiveTool(), onShapeComplete);

  canvas.on("mouse:down:before", onMouseDownBefore);
  canvas.on("mouse:down", onMouseDown);
  canvas.on("mouse:move", onMouseMove);
  canvas.on("mouse:up", onMouseUp);

  return () => {
    canvas.off("mouse:down:before", onMouseDownBefore);
    canvas.off("mouse:down", onMouseDown);
    canvas.off("mouse:move", onMouseMove);
    canvas.off("mouse:up", onMouseUp);
  };
}