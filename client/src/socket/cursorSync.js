import {
  emitCursorMove,
  listenForCursorMoves,
  listenForCursorRemoved,
} from "./socketClient";

const THROTTLE_MS = 40; // ~25 updates/sec — smooth enough, light on the socket

// Client sends its cursor coords on mousemove (throttled by attachCursorSync below)
export function broadcastCursorPosition(position) {
  emitCursorMove(position);
}

// Client listens for other users' cursor positions. Returns an unsubscribe function.
export function listenForCursorUpdates(callback) {
  return listenForCursorMoves(callback);
}

// Draws (or moves) a labeled cursor for one collaborator inside the canvas container
export function renderRemoteCursor(container, userId, position, color) {
  if (!container || !position) return;

  let el = container.querySelector(`[data-cursor-id="${userId}"]`);
  if (!el) {
    el = document.createElement("div");
    el.dataset.cursorId = userId;
    el.className = "remote-cursor";
    el.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16">' +
      '<path d="M1 1 L1 13 L4.5 10 L6.5 14.5 L8.5 13.5 L6.5 9 L11 9 Z" /></svg>' +
      '<span class="remote-cursor-label"></span>';
    container.appendChild(el);
  }

  el.style.setProperty("--cursor-color", color || "#1971c2");
  el.style.transform = `translate(${position.x}px, ${position.y}px)`;
  el.querySelector(".remote-cursor-label").textContent = userId.slice(0, 4);
}

// Removes a collaborator's cursor (e.g. once they disconnect)
export function removeRemoteCursor(container, userId) {
  container?.querySelector(`[data-cursor-id="${userId}"]`)?.remove();
}

// Wires mousemove broadcasting + remote cursor rendering for the canvas container.
// Tracks the native mousemove on the container (not Fabric's canvas events) since
// the cursor overlay is a plain positioned <div>, not a canvas object — it needs
// container-relative screen pixels, not Fabric's internal scene coordinates.
// Returns a cleanup function.
export function attachCursorSync(container) {
  if (!container) return () => {};

  let lastSent = 0;

  const onMouseMove = (e) => {
    const now = Date.now();
    if (now - lastSent < THROTTLE_MS) return;
    lastSent = now;
    const rect = container.getBoundingClientRect();
    broadcastCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const stopCursorUpdates = listenForCursorUpdates(({ id, color, position }) => {
    renderRemoteCursor(container, id, position, color);
  });

  const stopCursorRemoved = listenForCursorRemoved(({ id }) => {
    removeRemoteCursor(container, id);
  });

  container.addEventListener("mousemove", onMouseMove);

  return () => {
    container.removeEventListener("mousemove", onMouseMove);
    stopCursorUpdates();
    stopCursorRemoved();
    container.querySelectorAll(".remote-cursor").forEach((el) => el.remove());
  };
}