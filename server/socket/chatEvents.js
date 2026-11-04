import { randomUUID } from "crypto";

const MAX_MESSAGE_LENGTH = 1000; // characters per message
const MAX_HISTORY = 100; // messages remembered per board
const MIN_GAP_MS = 300; // basic anti-spam: one message per 300 ms per user

// roomId (board id) -> array of the latest messages
const roomHistory = new Map();

// Sends the saved messages of a board to ONE socket (used right after it joins)
export function sendChatHistory(socket, roomId) {
  socket.emit("chat:history", roomHistory.get(roomId) || []);
}

export function registerChatEvents(io, socket) {
  socket.on("chat:send", (payload) => {
    const roomId = socket.data.roomId;

    // Only people who actually joined a board room (and still have access) can chat
    if (!roomId || !socket.rooms.has(roomId)) return;

    const raw = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!raw) return;

    const now = Date.now();
    if (now - (socket.data.lastChatAt || 0) < MIN_GAP_MS) return;
    socket.data.lastChatAt = now;

    const message = {
      id: randomUUID(),
      userId: socket.data.userId,
      userName: socket.data.userName,
      text: raw.slice(0, MAX_MESSAGE_LENGTH),
      createdAt: now,
    };

    const history = roomHistory.get(roomId) || [];
    history.push(message);
    if (history.length > MAX_HISTORY) history.shift();
    roomHistory.set(roomId, history);

    // Everyone in the board room gets it, including the sender
    io.to(roomId).emit("chat:message", message);
  });
}