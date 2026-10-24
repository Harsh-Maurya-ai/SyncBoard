import { ApiError, saveBoardState } from "../api/client";

const DEBOUNCE_MS = 1500;
const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000, 30000];
const KEEPALIVE_LIMIT = 60000; // browsers cap keepalive request bodies at 64 KB
const CHANGE_EVENTS = [
  "object:added",
  "object:modified",
  "object:removed",
  "path:created",
];

// 4xx answers will not change by trying again (except timeouts / rate limits)
function isPermanent(err) {
  return (
    err instanceof ApiError &&
    err.status >= 400 &&
    err.status < 500 &&
    err.status !== 408 &&
    err.status !== 429
  );
}

/**
 * Auto-saves the canvas to the server a moment after every change.
 *
 * onStatus(status, info)
 *   status: "saving" | "saved" | "error"
 *   info (only on "error"): { permanent, httpStatus, message }
 *
 * Returns { saveNow({ closing }), stop() }
 */
export function autoSave(
  canvas,
  boardId,
  { canSave = () => true, onStatus = () => {} } = {}
) {
  let debounceTimer = null;
  let retryTimer = null;
  let saving = false;
  let queued = null; // newest snapshot waiting for the running save to finish
  let blocked = false; // true after a permanent error, until the user clicks Save
  let stopped = false;
  let attempt = 0;

  const report = (status, info) => {
    if (!stopped) onStatus(status, info);
  };

  const clearTimers = () => {
    clearTimeout(debounceTimer);
    clearTimeout(retryTimer);
    debounceTimer = null;
    retryTimer = null;
  };

  function handleFailure(err) {
    queued = null;
    const message = err?.message || "Save failed";

    if (isPermanent(err)) {
      blocked = true;
      console.error(`[autosave] ${err.status}: ${message} (not retrying)`);
      report("error", { permanent: true, httpStatus: err.status, message });
      return;
    }

    console.warn(
      `[autosave] failed (${err?.status ?? "network"}): ${message}. Will retry.`
    );
    report("error", { permanent: false, httpStatus: err?.status ?? 0, message });
    if (stopped) return;

    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    attempt += 1;
    retryTimer = setTimeout(() => flush(), delay);
  }

  async function send(data, closing) {
    saving = true;
    report("saving");

    try {
      // keepalive requests are limited to ~64 KB, so only use it for small boards
      const keepalive = closing && JSON.stringify(data).length < KEEPALIVE_LIMIT;
      await saveBoardState(boardId, data, { keepalive });
      attempt = 0;
      saving = false;

      if (queued) {
        const next = queued;
        queued = null;
        send(next.data, next.closing);
      } else {
        report("saved");
      }
    } catch (err) {
      saving = false;
      handleFailure(err);
    }
  }

  // Serializes the canvas right now, then sends it
  function flush(closing = false) {
    clearTimers();
    if (!canSave()) return;

    const data = canvas.toObject(["id"]);
    if (saving) {
      queued = { data, closing };
      return;
    }
    send(data, closing);
  }

  function schedule() {
    if (stopped || blocked) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => flush(), DEBOUNCE_MS);
  }

  CHANGE_EVENTS.forEach((name) => canvas.on(name, schedule));

  return {
    saveNow({ closing = false } = {}) {
      blocked = false;
      attempt = 0;
      flush(closing);
    },
    stop() {
      stopped = true;
      clearTimers();
      CHANGE_EVENTS.forEach((name) => canvas.off(name, schedule));
    },
  };
}