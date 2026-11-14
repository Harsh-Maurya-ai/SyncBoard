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

// Draws (or moves) a labeled cursor for one collaborator inside the canvas container.
// position is in BOARD coordinates; zoom converts it to screen pixels.
export function renderRemoteCursor(container, userId, position, color, zoom = 1) {
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

  // remember the board position, so the cursor can be moved again when we zoom
  el.dataset.boardX = String(position.x);
  el.dataset.boardY = String(position.y);

  el.style.setProperty("--cursor-color", color || "#1971c2");
  el.style.transform = `translate(${position.x * zoom}px, ${position.y * zoom}px)`;
  el.querySelector(".remote-cursor-label").textContent = userId.slice(0, 4);
}

// After the local zoom changed: put every remote cursor at its new screen position
export function repositionRemoteCursors(container, zoom) {
  if (!container) return;
  container.querySelectorAll(".remote-cursor").forEach((el) => {
    const x = Number(el.dataset.boardX) || 0;
    const y = Number(el.dataset.boardY) || 0;
    el.style.transform = `translate(${x * zoom}px, ${y * zoom}px)`;
  });
}

// Removes a collaborator's cursor (e.g. once they disconnect)
export function removeRemoteCursor(container, userId) {
  container?.querySelector(`[data-cursor-id="${userId}"]`)?.remove();
}

// Wires mousemove broadcasting + remote cursor rendering for the canvas container.
// The container scrolls and can be zoomed, so positions are sent as BOARD coordinates
// ((screen position + scroll) / zoom). They match the canvas coordinates exactly.
// Returns a cleanup function.
export function attachCursorSync(container, getZoom = () => 1) {
  if (!container) return () => {};

  let lastSent = 0;

  const onMouseMove = (e) => {
    const now = Date.now();
    if (now - lastSent < THROTTLE_MS) return;
    lastSent = now;
    const rect = container.getBoundingClientRect();
    const zoom = getZoom() || 1;
    broadcastCursorPosition({
      x: (e.clientX - rect.left + container.scrollLeft) / zoom,
      y: (e.clientY - rect.top + container.scrollTop) / zoom,
    });
  };

  const stopCursorUpdates = listenForCursorUpdates(({ id, color, position }) => {
    renderRemoteCursor(container, id, position, color, getZoom());
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