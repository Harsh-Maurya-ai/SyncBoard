import { Canvas, PencilBrush } from "fabric";

export function isTextObject(obj) {
  return Boolean(obj) && typeof obj.type === "string" && obj.type.toLowerCase() === "itext";
}

export function initCanvas(canvasElRef, containerRef) {
  const canvas = new Canvas(canvasElRef.current, {
    isDrawingMode: false,
    backgroundColor: "#ffffff",
    selection: true,
    preserveObjectStacking: true,
  });

  canvas.freeDrawingBrush = new PencilBrush(canvas);
  canvas.freeDrawingBrush.width = 3;
  canvas.freeDrawingBrush.color = "#000000";

  resizeCanvas(canvas, containerRef);
  return canvas;
}

export function resizeCanvas(canvas, containerRef) {
  if (!canvas || !containerRef?.current) return;
  const { clientWidth, clientHeight } = containerRef.current;
  canvas.setDimensions({ width: clientWidth, height: clientHeight });
  canvas.renderAll();
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
      canvas.isDrawingMode = false;
      canvas.selection = false;
      break;

    case "select":
    default:
      canvas.isDrawingMode = false;
      canvas.selection = true;
      break;
  }

  canvas.forEachObject((obj) => {
    // In the Text tool, existing text stays clickable so it can be edited
    const interactive =
      toolName === "select" || (toolName === "text" && isTextObject(obj));
    obj.selectable = interactive;
    obj.evented = interactive;
  });

  canvas.requestRenderAll();
}