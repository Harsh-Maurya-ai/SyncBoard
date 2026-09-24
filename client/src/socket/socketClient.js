import { io } from "socket.io-client";

const DEFAULT_SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

let socket = null;
let currentRoomId = null;

// Reads ?room=xxxx from the URL. If missing, creates one and puts it in the URL
// so the link can be shared with collaborators.
export function getRoomId() {
  const params = new URLSearchParams(window.location.search);
  let room = params.get("room");

  if (!room) {
    room = Math.random().toString(36).slice(2, 8);
    params.set("room", room);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );
  }
  return room;
}

// Client connects to the Socket.io server
export function connectSocket(serverUrl = DEFAULT_SERVER_URL) {
  if (socket) return socket;

  socket = io(serverUrl);

  // (Re)join the room every time we connect, including after a reconnect
  socket.on("connect", () => {
    if (currentRoomId) socket.emit("room:join", currentRoomId);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentRoomId = null;
}

export function joinRoom(roomId) {
  currentRoomId = roomId;
  if (socket && socket.connected) socket.emit("room:join", roomId);
}

// Client sends a draw action as it happens
export function emitDrawEvent(roomId, eventData) {
  if (!socket || !socket.connected) return;
  socket.emit("draw:event", { roomId, event: eventData });
}

// Client listens for other users' draw actions. Returns an unsubscribe function.
export function listenForDrawEvents(callback) {
  const s = connectSocket();
  s.on("draw:event", callback);
  return () => s.off("draw:event", callback);
}

// Calls callback(true/false) whenever the connection state changes
export function listenForConnectionStatus(callback) {
  const s = connectSocket();
  const onConnect = () => callback(true);
  const onDisconnect = () => callback(false);

  s.on("connect", onConnect);
  s.on("disconnect", onDisconnect);
  callback(s.connected);

  return () => {
    s.off("connect", onConnect);
    s.off("disconnect", onDisconnect);
  };
}

// Calls callback(count) with the number of users in the room
export function listenForRoomUsers(callback) {
  const s = connectSocket();
  s.on("room:users", callback);
  return () => s.off("room:users", callback);
}