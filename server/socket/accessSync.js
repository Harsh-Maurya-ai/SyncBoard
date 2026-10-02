import Board from "../models/Board.js";
import { getUserRole } from "../utils/access.js";
import { handleUserLeft } from "./presence.js";

// Re-checks the board's permissions for sockets that are currently in its room.
//  - role changed  -> the socket gets the new role right away ("room:role")
//  - access gone   -> the socket is removed from the room ("room:kicked")
// Pass userId = null to re-check everybody (used when a board is deleted).
export async function refreshSocketAccess(io, boardId, userId = null) {
  if (!io) return;
  const roomId = String(boardId);

  try {
    const board = await Board.findById(roomId).select("ownerId members").lean();
    const sockets = await io.in(roomId).fetchSockets();
    let removedSomeone = false;

    for (const s of sockets) {
      if (userId && s.data.userId !== String(userId)) continue;

      const role = getUserRole(board, s.data.userId);
      if (role) {
        s.data.role = role;
        s.emit("room:role", { role });
      } else {
        s.leave(roomId);
        s.data.roomId = undefined;
        s.data.role = null;
        handleUserLeft(io, s, roomId);
        s.emit("room:kicked", { reason: board ? "removed" : "deleted" });
        removedSomeone = true;
      }
    }

    if (removedSomeone) {
      const count = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
      io.to(roomId).emit("room:users", count);
    }
  } catch (err) {
    console.error("[socket] refreshSocketAccess failed:", err);
  }
}