import { Server } from "socket.io";
import { registerDrawEvents } from "./drawEvents.js";

export function initSocketServer(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e7, // allow large full-board syncs (10 MB)
  });

  io.on("connection", (socket) => handleConnection(io, socket));
  return io;
}

// Runs on every new client connection
function handleConnection(io, socket) {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on("room:join", (roomId) => joinRoom(io, socket, roomId));
  registerDrawEvents(socket);
  socket.on("disconnect", (reason) => handleDisconnect(io, socket, reason));
}

function emitRoomUsers(io, roomId) {
  const count = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
  io.to(roomId).emit("room:users", count);
}

// Puts a client into a board-specific room
export function joinRoom(io, socket, roomId) {
  if (typeof roomId !== "string" || roomId.length === 0 || roomId.length > 100) {
    return;
  }

  const previous = socket.data.roomId;
  if (previous === roomId) {
    emitRoomUsers(io, roomId);
    return;
  }

  if (previous) {
    socket.leave(previous);
    emitRoomUsers(io, previous);
  }

  socket.join(roomId);
  socket.data.roomId = roomId;
  console.log(`[socket] ${socket.id} joined room ${roomId}`);
  emitRoomUsers(io, roomId);
}

// Cleans up when a user leaves
export function handleDisconnect(io, socket, reason) {
  console.log(`[socket] disconnected: ${socket.id} (${reason})`);
  const roomId = socket.data.roomId;
  if (roomId) emitRoomUsers(io, roomId);
}