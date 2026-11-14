import { MIN_ZOOM, MAX_ZOOM, setBoardZoom } from "./canvasSetup";

export { MIN_ZOOM, MAX_ZOOM };

export const ZOOM_STEP = 0.25; // each + / - click

// Next zoom level when pressing + (direction 1) or - (direction -1).
// Snaps to the step grid, so 87% -> 100% -> 125%.
export function stepZoom(zoom, direction) {
  const steps = zoom / ZOOM_STEP;
  const next =
    direction > 0 ? Math.floor(steps + 1e-6) + 1 : Math.ceil(steps - 1e-6) - 1;
  return next * ZOOM_STEP;
}

// Changes the zoom and scrolls the board so the point that was under `from`
// ends up under `anchor` (both are pixel positions inside the visible window).
// Without an anchor it zooms around the center of the window.
export function zoomAround(canvas, container, nextZoom, anchor, from = anchor) {
  const previous = canvas.getZoom();
  const zoom = setBoardZoom(canvas, nextZoom);

  if (container) {
    const target = anchor || {
      x: container.clientWidth / 2,
      y: container.clientHeight / 2,
    };
    const source = from || target;

    // board point that was under `source` before zooming
    const boardX = (container.scrollLeft + source.x) / previous;
    const boardY = (container.scrollTop + source.y) / previous;

    container.scrollLeft = boardX * zoom - target.x;
    container.scrollTop = boardY * zoom - target.y;
  }

  return zoom;
}

// Ctrl + mouse wheel (also trackpad pinch) and two-finger pinch on touch screens.
// onZoom(nextZoom, anchor, from) must apply the zoom (see Whiteboard.jsx).
// Returns a cleanup function.
export function attachZoomGestures(canvas, containerRef, { getActiveTool, onZoom }) {
  const container = containerRef.current;
  if (!container) return () => {};

  // client (screen) position -> position inside the visible window
  const toWindow = (clientX, clientY) => {
    const rect = container.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  /* ---- Ctrl + wheel / trackpad pinch ---- */
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return; // normal wheel = normal scrolling
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0025);
    const point = toWindow(e.clientX, e.clientY);
    onZoom(canvas.getZoom() * factor, point, point);
  };

  /* ---- Two-finger pinch (Hand tool and view-only mode) ---- */
  let pinch = null;

  const distance = (t) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const center = (t) =>
    toWindow((t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2);

  const canPinch = () => {
    const tool = getActiveTool();
    return tool === "hand" || tool === "view";
  };

  const onTouchStart = (e) => {
    if (e.touches.length !== 2 || !canPinch()) {
      pinch = null;
      return;
    }
    pinch = {
      distance: distance(e.touches),
      zoom: canvas.getZoom(),
      center: center(e.touches),
    };
  };

  const onTouchMove = (e) => {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault(); // we move the board ourselves

    const nextCenter = center(e.touches);
    const nextZoom = pinch.zoom * (distance(e.touches) / pinch.distance);
    onZoom(nextZoom, nextCenter, pinch.center);
    pinch.center = nextCenter;
  };

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) pinch = null;
  };

  container.addEventListener("wheel", onWheel, { passive: false });
  container.addEventListener("touchstart", onTouchStart, { passive: true });
  container.addEventListener("touchmove", onTouchMove, { passive: false });
  container.addEventListener("touchend", onTouchEnd, { passive: true });
  container.addEventListener("touchcancel", onTouchEnd, { passive: true });

  return () => {
    container.removeEventListener("wheel", onWheel);
    container.removeEventListener("touchstart", onTouchStart);
    container.removeEventListener("touchmove", onTouchMove);
    container.removeEventListener("touchend", onTouchEnd);
    container.removeEventListener("touchcancel", onTouchEnd);
  };
}