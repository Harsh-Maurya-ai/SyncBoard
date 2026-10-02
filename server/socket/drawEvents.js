import { canEdit } from "../utils/access.js";

export function registerDrawEvents(socket) {
  socket.on("draw:event", (payload) => {
    const { roomId, event } = payload || {};
    broadcastDrawEvent(socket, roomId, event);
  });
}

// Relays a draw event to everyone else in the room
export function broadcastDrawEvent(socket, roomId, eventData) {
  if (!eventData || typeof roomId !== "string") return;
  // Only allow sending to the room this socket actually joined
  if (socket.data.roomId !== roomId || !socket.rooms.has(roomId)) return;
  // Viewers are read-only
  if (!canEdit(socket.data.role)) return;

  socket.to(roomId).emit("draw:event", eventData);
}