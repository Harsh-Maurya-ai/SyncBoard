import { util } from "fabric";
import { emitDrawEvent, listenForDrawEvents } from "./socketClient";
import { isHistoryRestoring, pushToHistory } from "../canvas/history";
import { isTextObject } from "../canvas/canvasSetup";

const SYNC_PROPS = ["id"];

let applyingRemote = false; // true while we apply someone else's change (prevents echo loops)
let queue = Promise.resolve(); // remote events are applied one at a time, in order

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function findById(canvas, id) {
  return canvas.getObjects().find((obj) => obj.id === id);
}

// Remote objects follow the LOCAL user's current tool
function applyToolState(obj, tool) {
  const interactive = tool === "select" || (tool === "text" && isTextObject(obj));
  obj.selectable = interactive;
  obj.evented = interactive;
}

function mutateAsRemote(fn) {
  applyingRemote = true;
  try {
    fn();
  } finally {
    applyingRemote = false;
  }
}

/* ------------------------------------------------------------------ */
/* Sending local changes                                               */
/* ------------------------------------------------------------------ */

// Any finished object without an id is new: give it one and announce it.
// Text that is still being typed is skipped until editing ends.
function emitNewObjects(canvas, roomId) {
  canvas.getObjects().forEach((obj) => {
    if (obj.id || obj.isEditing) return;
    obj.id = generateId();
    emitDrawEvent(roomId, { type: "add", object: obj.toObject(SYNC_PROPS) });
  });
}

function emitModified(canvas, roomId, target) {
  // Several objects moved/scaled together
  if (target.type && target.type.toLowerCase() === "activeselection") {
    const ids = new Set(
      target
        .getObjects()
        .map((o) => o.id)
        .filter(Boolean)
    );
    canvas
      .toObject(SYNC_PROPS)
      .objects.filter((o) => ids.has(o.id))
      .forEach((o) =>
        emitDrawEvent(roomId, { type: "modify", id: o.id, object: o })
      );
    return;
  }

  if (!target.id) {
    emitNewObjects(canvas, roomId);
    return;
  }

  emitDrawEvent(roomId, {
    type: "modify",
    id: target.id,
    object: target.toObject(SYNC_PROPS),
  });
}

// Sends the whole board (used after undo / redo / clear / load)
export function broadcastFullBoard(canvas, roomId) {
  if (!canvas) return;
  canvas.getObjects().forEach((obj) => {
    if (!obj.id) obj.id = generateId();
  });
  const { objects } = canvas.toObject(SYNC_PROPS);
  emitDrawEvent(roomId, { type: "replace", objects });
}

/* ------------------------------------------------------------------ */
/* Receiving remote changes                                            */
/* ------------------------------------------------------------------ */

// Renders another user's stroke/shape onto the local canvas
export async function applyRemoteDrawEvent(canvas, event, getActiveTool) {
  if (!canvas || !event || !event.type) return;
  const tool = getActiveTool();

  switch (event.type) {
    case "add":
    case "modify": {
      const data = event.object;
      if (!data) return;
      const [obj] = await util.enlivenObjects([data]);
      if (!obj) return;

      obj.id = data.id;
      applyToolState(obj, tool);

      const existing = findById(canvas, data.id);
      mutateAsRemote(() => {
        if (existing) {
          const index = canvas.getObjects().indexOf(existing);
          canvas.remove(existing);
          canvas.insertAt(index, obj);
        } else {
          canvas.add(obj);
        }
      });
      break;
    }

    case "remove": {
      const existing = findById(canvas, event.id);
      if (existing) mutateAsRemote(() => canvas.remove(existing));
      break;
    }

    case "replace": {
      const list = event.objects || [];
      const objs = list.length ? await util.enlivenObjects(list) : [];
      objs.forEach((obj, i) => {
        obj.id = list[i].id;
        applyToolState(obj, tool);
      });

      mutateAsRemote(() => {
        canvas.discardActiveObject();
        canvas.remove(...[...canvas.getObjects()]);
        if (objs.length) canvas.add(...objs);
      });
      break;
    }

    default:
      return;
  }

  canvas.requestRenderAll();
  pushToHistory(canvas); // keep local undo history in step with what's on screen
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

export function attachCanvasSync(canvas, { roomId, getActiveTool }) {
  const onNew = () => {
    if (!applyingRemote) emitNewObjects(canvas, roomId);
  };

  const onModified = ({ target }) => {
    if (!target || applyingRemote) return;
    emitModified(canvas, roomId, target);
  };

  const onRemoved = ({ target }) => {
    if (!target || !target.id) return;
    if (applyingRemote || isHistoryRestoring()) return;
    if (getActiveTool() !== "eraser") return; // only the eraser removes single objects
    emitDrawEvent(roomId, { type: "remove", id: target.id });
  };

  canvas.on("path:created", onNew); // finished freehand stroke
  canvas.on("mouse:up", onNew); // finished shape
  canvas.on("object:modified", onModified); // moved / resized / finished typing
  canvas.on("object:removed", onRemoved);

  const stopListening = listenForDrawEvents((event) => {
    queue = queue
      .then(() => applyRemoteDrawEvent(canvas, event, getActiveTool))
      .catch((err) => console.error("Failed to apply remote event:", err));
  });

  return () => {
    canvas.off("path:created", onNew);
    canvas.off("mouse:up", onNew);
    canvas.off("object:modified", onModified);
    canvas.off("object:removed", onRemoved);
    stopListening();
  };
}