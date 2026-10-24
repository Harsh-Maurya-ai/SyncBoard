import { jsPDF } from "jspdf";

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/**
 * Export canvas as PNG
 */
export function exportBoardAsPNG(canvas, title = "syncboard") {
  if (!canvas) return;

  canvas.discardActiveObject();
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier: 2,
  });

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${title || "syncboard"}-${timestamp()}.png`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export canvas as PDF
 */
export function exportBoardAsPDF(canvas, title = "syncboard") {
  if (!canvas) return;

  canvas.discardActiveObject();
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier: 2,
  });

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [canvas.getWidth(), canvas.getHeight()],
  });

  pdf.addImage(
    dataUrl,
    "PNG",
    0,
    0,
    canvas.getWidth(),
    canvas.getHeight()
  );

  pdf.save(`${title || "syncboard"}-${timestamp()}.pdf`);
}

/**
 * Auto-save canvas to server
 */
export function autoSave(canvas, boardId, { canSave, onStatus } = {}) {
  let timer = null;
  let stopped = false;

  const save = async ({ closing = false } = {}) => {
    if (stopped || !canvas || !boardId) return;
    if (canSave && !canSave()) return;

    try {
      onStatus?.("saving");

      const canvasJSON = JSON.stringify(canvas.toObject(["id"]));

      const response = await fetch(
        `http://localhost:5000/api/boards/${boardId}/state`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("syncboard-token")}`,
          },
          body: JSON.stringify({ canvasJSON }),
          keepalive: closing,
        }
      );

      if (!response.ok) {
        throw new Error("Save failed");
      }

      onStatus?.("saved");
    } catch (err) {
      console.error("Auto-save failed:", err);
      onStatus?.("error");
    }
  };

  const scheduleSave = () => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      save();
    }, 1000);
  };

  canvas.on("path:created", scheduleSave);
  canvas.on("object:modified", scheduleSave);
  canvas.on("object:added", scheduleSave);
  canvas.on("object:removed", scheduleSave);

  return {
    saveNow: save,

    stop() {
      stopped = true;
      clearTimeout(timer);

      canvas.off("path:created", scheduleSave);
      canvas.off("object:modified", scheduleSave);
      canvas.off("object:added", scheduleSave);
      canvas.off("object:removed", scheduleSave);
    },
  };
}