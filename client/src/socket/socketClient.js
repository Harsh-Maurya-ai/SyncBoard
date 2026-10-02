import { io } from "socket.io-client";
import { clearToken, getToken } from "../api/client";

const DEFAULT_SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

let socket = null;
let currentRoomId = null;

// Client connects to the Socket.io server (logged-in users only: the JWT goes
// in the handshake and the server rejects the connection without it)
export function connectSocket(serverUrl = DEFAULT_SERVER_URL) {
  if (socket) return socket;

  socket = io(serverUrl, {
    // a function, so a reconnect always sends the latest token
    auth: (cb) => cb({ token: getToken() }),
  });

  // (Re)join the room every time we connect, including after a reconnect
  socket.on("connect", () => {
    if (currentRoomId) socket.emit("room:join", currentRoomId);
  });

  // Token missing / expired: stop retrying and send the user to the login page
  socket.on("connect_error", (err) => {
    if (err.message === "Unauthorized") {
      socket.disconnect();
      clearToken();
      window.dispatchEvent(new Event("syncboard:logout"));
    }
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

// roomId is the board id
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

// The owner changed your role while you're on the board: callback({ role })
export function listenForRoomRole(callback) {
  const s = connectSocket();
  s.on("room:role", callback);
  return () => s.off("room:role", callback);
}

// You were removed from the board (or it was deleted): callback({ reason })
export function listenForRoomKicked(callback) {
  const s = connectSocket();
  s.on("room:kicked", callback);
  return () => s.off("room:kicked", callback);
}

// Client sends its cursor coords on mousemove (caller is responsible for throttling)
export function emitCursorMove(position) {
  if (!socket || !socket.connected) return;
  socket.emit("cursor:move", position);
}

// Client listens for other users' cursor positions. Returns an unsubscribe function.
export function listenForCursorMoves(callback) {
  const s = connectSocket();
  s.on("cursor:move", callback);
  return () => s.off("cursor:move", callback);
}

// Client listens for a collaborator disconnecting, so their cursor can be removed
export function listenForCursorRemoved(callback) {
  const s = connectSocket();
  s.on("cursor:remove", callback);
  return () => s.off("cursor:remove", callback);
}

// New joiner: the server asks an existing peer to send the current board
export function listenForStateRequest(callback) {
  const s = connectSocket();
  s.on("board:provide-state", callback);
  return () => s.off("board:provide-state", callback);
}

// Existing peer: sends this client's board state to the socket that requested it
export function sendBoardState(requesterId, boardState) {
  if (!socket || !socket.connected) return;
  socket.emit("board:respond-state", { requesterId, boardState });
}

// New joiner: receives the board state a peer sent in response to our join
export function listenForBoardState(callback) {
  const s = connectSocket();
  s.on("board:state", callback);
  return () => s.off("board:state", callback);
}