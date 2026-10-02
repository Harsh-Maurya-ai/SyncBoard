import { canEdit } from "../utils/access.js";

const CURSOR_COLORS = [
  "#e03131",
  "#f08c00",
  "#2f9e44",
  "#1971c2",
  "#9c36b5",
  "#e64980",
  "#0ca678",
  "#f59f00",
];

const roomColors = new Map(); // roomId -> Map(socketId -> color)

function assignColor(roomId, socketId) {
  if (!roomColors.has(roomId)) roomColors.set(roomId, new Map());
  const colors = roomColors.get(roomId);
  const used = new Set(colors.values());
  const color =
    CURSOR_COLORS.find((c) => !used.has(c)) ||
    CURSOR_COLORS[colors.size % CURSOR_COLORS.length];
  colors.set(socketId, color);
  return color;
}

function releaseColor(roomId, socketId) {
  const colors = roomColors.get(roomId);
  if (!colors) return;
  colors.delete(socketId);
  if (colors.size === 0) roomColors.delete(roomId);
}

// New joiner asks for the current board state: the server picks another member
// who is allowed to edit (viewers never seed a board) and asks THEM to send it.
function requestCanvasState(io, socket, roomId) {
  const room = io.sockets.adapter.rooms.get(roomId);
  const providerId = room
    ? [...room].find(
        (id) => id !== socket.id && canEdit(io.sockets.sockets.get(id)?.data.role)
      )
    : null;
  if (!providerId) return; // nobody to ask: the joiner keeps the version saved in MongoDB
  io.to(providerId).emit("board:provide-state", { requesterId: socket.id });
}

// Existing client's board state, forwarded on to the new joiner
function syncCanvasState(io, requesterId, boardState) {
  io.to(requesterId).emit("board:state", boardState);
}

// Assigns the new user a cursor color and kicks off the board sync for them
export function handleUserJoined(io, socket, roomId) {
  socket.data.color = assignColor(roomId, socket.id);
  requestCanvasState(io, socket, roomId);
}

// Frees the color and tells the room to remove this user's cursor
export function handleUserLeft(io, socket, roomId) {
  releaseColor(roomId, socket.id);
  io.to(roomId).emit("cursor:remove", { id: socket.id });
}

export function registerPresenceEvents(io, socket) {
  // A peer responding to "board:provide-state" with its current board
  socket.on("board:respond-state", (payload) => {
    const { requesterId, boardState } = payload || {};
    if (typeof requesterId !== "string" || !boardState) return;
    if (!canEdit(socket.data.role)) return;

    // Only hand the board to someone in the same room
    const requester = io.sockets.sockets.get(requesterId);
    if (!requester || requester.data.roomId !== socket.data.roomId) return;

    syncCanvasState(io, requesterId, boardState);
  });

  // A client's cursor position, relayed to the rest of its room with its
  // assigned color attached
  socket.on("cursor:move", (position) => {
    const roomId = socket.data.roomId;
    const valid =
      position && typeof position.x === "number" && typeof position.y === "number";
    if (!roomId || !valid) return;

    socket.to(roomId).emit("cursor:move", {
      id: socket.id,
      color: socket.data.color,
      position,
    });
  });
}