// Shared role helpers used by the REST controllers and the Socket.io server

const ROLE_RANK = { viewer: 1, editor: 2, owner: 3 };

// A MongoDB ObjectId as a 24-character hex string
export function isValidId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}

// Returns "owner" | "editor" | "viewer" | null for this user on this board.
// Works with Mongoose documents and lean() objects, populated or not.
export function getUserRole(board, userId) {
  if (!board || !userId) return null;
  const uid = String(userId);

  const ownerId = board.ownerId?._id ?? board.ownerId;
  if (ownerId && String(ownerId) === uid) return "owner";

  const member = (board.members || []).find(
    (m) => String(m.userId?._id ?? m.userId) === uid
  );
  return member ? member.role : null;
}

// hasRole("editor", "viewer") -> true, hasRole("viewer", "editor") -> false
export function hasRole(role, minRole) {
  return (ROLE_RANK[role] || 0) >= (ROLE_RANK[minRole] || Infinity);
}

// Owners and editors can change the board; viewers are read-only
export function canEdit(role) {
  return hasRole(role, "editor");
}