import { Rect, Circle, Line, IText, Triangle, Group, Point } from "fabric";
import { pushToHistory } from "./history";

let isDrawing = false;
let startPoint = null;
let activeShape = null;
let currentShapeType = "rectangle";
let currentStrokeColor = "#000000";
let currentStrokeWidth = 3;

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
  const text = new IText("Type here", {
    left: position.x,
    top: position.y,
    fontSize: 20,
    fill: currentStrokeColor,
  });
  canvas.add(text);
  canvas.setActiveObject(text);
  text.enterEditing();
  pushToHistory(canvas);
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
    const pointer = canvas.getPointer(opt.e);
    eraseObjectAt(canvas, pointer);
    return;
  }

  if (toolName === "text") {
    const pointer = canvas.getPointer(opt.e);
    addTextBox(canvas, pointer);
    return;
  }

  if (toolName !== "shape") return;

  isDrawing = true;
  startPoint = canvas.getPointer(opt.e);
  activeShape = createShape(currentShapeType, startPoint, startPoint);
  canvas.add(activeShape);
}

export function handleMouseMove(canvas, opt, toolName) {
  if (toolName !== "shape" || !isDrawing || !activeShape) return;

  const pointer = canvas.getPointer(opt.e);
  activeShape = updateShapeGeometry(
    canvas,
    activeShape,
    currentShapeType,
    startPoint,
    pointer
  );
  canvas.requestRenderAll();
}

export function handleMouseUp(canvas, toolName) {
  if (toolName !== "shape" || !activeShape) return;

  activeShape.set({ selectable: true, evented: true });
  canvas.setActiveObject(activeShape);
  isDrawing = false;
  activeShape = null;
  startPoint = null;
  canvas.requestRenderAll();
  pushToHistory(canvas);
}

export function attachDrawingHandlers(canvas, getActiveTool) {
  const onMouseDown = (opt) => handleMouseDown(canvas, opt, getActiveTool());
  const onMouseMove = (opt) => handleMouseMove(canvas, opt, getActiveTool());
  const onMouseUp = () => handleMouseUp(canvas, getActiveTool());

  canvas.on("mouse:down", onMouseDown);
  canvas.on("mouse:move", onMouseMove);
  canvas.on("mouse:up", onMouseUp);

  return () => {
    canvas.off("mouse:down", onMouseDown);
    canvas.off("mouse:move", onMouseMove);
    canvas.off("mouse:up", onMouseUp);
  };
}