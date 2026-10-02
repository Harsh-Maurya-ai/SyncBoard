import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Board from "../models/Board.js";
import { getUserRole, isValidId } from "../utils/access.js";
import { registerDrawEvents } from "./drawEvents.js";
import {
  handleUserJoined,
  handleUserLeft,
  registerPresenceEvents,
} from "./presence.js";

export function initSocketServer(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e7, // allow large full-board syncs (10 MB)
  });

  io.use(authenticateSocket);
  io.on("connection", (socket) => handleConnection(io, socket));
  return io;
}

// Only logged-in users may connect: the client sends its JWT in the handshake
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select("name");
    if (!user) return next(new Error("Unauthorized"));

    socket.data.userId = String(user._id);
    socket.data.userName = user.name;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
}

// Runs on every new client connection
function handleConnection(io, socket) {
  console.log(`[socket] connected: ${socket.id} (${socket.data.userName})`);

  socket.on("room:join", (roomId) => {
    joinRoom(io, socket, roomId).catch((err) =>
      console.error("[socket] joinRoom failed:", err)
    );
  });
  registerDrawEvents(socket);
  registerPresenceEvents(io, socket);
  socket.on("disconnect", (reason) => handleDisconnect(io, socket, reason));
}

function emitRoomUsers(io, roomId) {
  const count = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
  io.to(roomId).emit("room:users", count);
}

// Puts a client into a board-specific room (the room id is the board id),
// but only if that user has access to the board
export async function joinRoom(io, socket, roomId) {
  if (!isValidId(roomId)) return;

  const board = await Board.findById(roomId).select("ownerId members").lean();
  const role = getUserRole(board, socket.data.userId);
  if (!role) {
    socket.emit("room:kicked", { reason: board ? "no-access" : "missing" });
    return;
  }
  if (socket.disconnected) return; // left while we were checking

  const previous = socket.data.roomId;
  if (previous === roomId) {
    socket.data.role = role;
    emitRoomUsers(io, roomId);
    return;
  }

  if (previous) {
    socket.leave(previous);
    handleUserLeft(io, socket, previous);
    emitRoomUsers(io, previous);
  }

  socket.data.role = role;
  socket.join(roomId);
  socket.data.roomId = roomId;
  console.log(`[socket] ${socket.id} joined room ${roomId} as ${role}`);
  handleUserJoined(io, socket, roomId);
  emitRoomUsers(io, roomId);
}

// Cleans up when a user leaves
export function handleDisconnect(io, socket, reason) {
  console.log(`[socket] disconnected: ${socket.id} (${reason})`);
  const roomId = socket.data.roomId;
  if (roomId) {
    handleUserLeft(io, socket, roomId);
    emitRoomUsers(io, roomId);
  }
}