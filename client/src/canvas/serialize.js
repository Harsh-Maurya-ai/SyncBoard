export function exportToJSON(canvas) {
  return JSON.stringify(canvas.toObject(["id"]));
}

export async function loadFromJSON(canvas, json, onDone) {
  try {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    await canvas.loadFromJSON(data);
    canvas.renderAll();
    if (onDone) onDone();
    return true;
  } catch (err) {
    console.error("Failed to load board:", err);
    return false;
  }
}

export function saveToLocalStorage(canvas, key = "syncboard-local-save") {
  const json = exportToJSON(canvas);
  localStorage.setItem(key, json);
  return json;
}

export function loadFromLocalStorage(
  canvas,
  onDone,
  key = "syncboard-local-save"
) {
  const json = localStorage.getItem(key);
  if (!json) return false;
  loadFromJSON(canvas, json, onDone);
  return true;
}

export function downloadAsFile(canvas, filename = "syncboard-board.json") {
  const json = exportToJSON(canvas);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function loadFromFile(canvas, file, onDone) {
  const reader = new FileReader();
  reader.onload = (e) => {
    loadFromJSON(canvas, e.target.result, onDone);
  };
  reader.readAsText(file);
}