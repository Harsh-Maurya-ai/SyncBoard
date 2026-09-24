let undoStack = [];
let redoStack = [];
let isRestoring = false;

// "id" is kept so objects stay identifiable across undo/redo (needed for sync)
function snapshot(canvas) {
  return canvas.toObject(["id"]);
}

export function isHistoryRestoring() {
  return isRestoring;
}

export function initHistory(canvas) {
  undoStack = [snapshot(canvas)];
  redoStack = [];
}

export function pushToHistory(canvas) {
  if (isRestoring) return;
  undoStack.push(snapshot(canvas));
  redoStack = [];
}

export function undo(canvas, onDone) {
  if (isRestoring || undoStack.length <= 1) return;
  const current = undoStack.pop();
  redoStack.push(current);
  const previous = undoStack[undoStack.length - 1];
  restoreState(canvas, previous, onDone);
}

export function redo(canvas, onDone) {
  if (isRestoring || redoStack.length === 0) return;
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

async function restoreState(canvas, state, onDone) {
  isRestoring = true;
  try {
    await canvas.loadFromJSON(state);
    canvas.renderAll();
  } catch (err) {
    console.error("Failed to restore state:", err);
  } finally {
    isRestoring = false;
  }
  if (onDone) onDone();
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