const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
const TOKEN_KEY = "syncboard-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body, keepalive = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      keepalive,
    });
  } catch {
    throw new ApiError("Can't reach the server. Is it running?", 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON body
  }

  if (!res.ok) {
    // An expired / invalid token on a normal request means the session is over
    const isAuthForm = path === "/auth/login" || path === "/auth/register";
    if (res.status === 401 && !isAuthForm) {
      clearToken();
      window.dispatchEvent(new Event("syncboard:logout"));
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

/* ---------- auth ---------- */
export const registerUser = (name, email, password) =>
  request("/auth/register", { method: "POST", body: { name, email, password } });

export const loginUser = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password } });

export const fetchMe = () => request("/auth/me");

/* ---------- boards ---------- */
export const listBoards = () => request("/boards");

export const createBoard = (title) =>
  request("/boards", { method: "POST", body: { title } });

export const fetchBoard = (boardId) => request(`/boards/${boardId}`);

export const saveBoardState = (boardId, canvasJSON, { keepalive = false } = {}) =>
  request(`/boards/${boardId}/state`, {
    method: "PUT",
    body: { canvasJSON },
    keepalive,
  });

export const renameBoard = (boardId, title) =>
  request(`/boards/${boardId}`, { method: "PATCH", body: { title } });

export const deleteBoard = (boardId) =>
  request(`/boards/${boardId}`, { method: "DELETE" });

/* ---------- sharing & permissions ---------- */
export const listMembers = (boardId) => request(`/boards/${boardId}/members`);

export const createShareLink = (boardId, role) =>
  request(`/boards/${boardId}/share`, { method: "POST", body: { role } });

export const revokeShareLink = (boardId) =>
  request(`/boards/${boardId}/share`, { method: "DELETE" });

export const joinBoardByToken = (token) =>
  request(`/boards/join/${token}`, { method: "POST" });

export const setMemberRole = (boardId, userId, role) =>
  request(`/boards/${boardId}/members/${userId}`, { method: "PUT", body: { role } });

export const removeMember = (boardId, userId) =>
  request(`/boards/${boardId}/members/${userId}`, { method: "DELETE" });