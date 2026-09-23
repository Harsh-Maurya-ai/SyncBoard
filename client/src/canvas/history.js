let undoStack = [];
let redoStack = [];
let isRestoring = false;

export function initHistory(canvas) {
  undoStack = [canvas.toJSON()];
  redoStack = [];
}

export function pushToHistory(canvas) {
  if (isRestoring) return;
  undoStack.push(canvas.toJSON());
  redoStack = [];
}

export function undo(canvas, onDone) {
  if (undoStack.length <= 1) return;
  const current = undoStack.pop();
  redoStack.push(current);
  const previous = undoStack[undoStack.length - 1];
  restoreState(canvas, previous, onDone);
}

export function redo(canvas, onDone) {
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(next);
  restoreState(canvas, next, onDone);
}

export function clearCanvas(canvas) {
  canvas.clear();
  canvas.backgroundColor = "#ffffff";
  canvas.renderAll();
  pushToHistory(canvas);
}

function restoreState(canvas, state, onDone) {
  isRestoring = true;
  canvas.loadFromJSON(state, () => {
    canvas.renderAll();
    isRestoring = false;
    if (onDone) onDone();
  });
}

export function attachHistoryHandlers(canvas) {
  const handler = () => pushToHistory(canvas);

  canvas.on("path:created", handler);
  canvas.on("object:modified", handler);

  return () => {
    canvas.off("path:created", handler);
    canvas.off("object:modified", handler);
  };
}

export function canUndo() {
  return undoStack.length > 1;
}

export function canRedo() {
  return redoStack.length > 0;
}