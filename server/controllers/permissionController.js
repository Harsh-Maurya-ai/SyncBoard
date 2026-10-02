import crypto from "crypto";
import Board from "../models/Board.js";
import { getUserRole, hasRole, isValidId } from "../utils/access.js";
import { refreshSocketAccess } from "../socket/accessSync.js";

const TOKEN_PATTERN = /^[a-f\d]{20,64}$/i;

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */

// checkAccess("viewer" | "editor" | "owner") -> middleware.
// Looks up :id, works out the caller's role, and rejects anyone below minRole.
// On success it sets req.board (without the heavy canvasJSON) and req.boardRole.
export function checkAccess(minRole = "viewer") {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!isValidId(id)) return res.status(404).json({ error: "Board not found" });

      const board = await Board.findById(id).select("-canvasJSON");
      if (!board) return res.status(404).json({ error: "Board not found" });

      const role = getUserRole(board, req.userId);
      if (!role) {
        return res.status(403).json({ error: "You don't have access to this board" });
      }
      if (!hasRole(role, minRole)) {
        return res.status(403).json({
          error:
            minRole === "owner"
              ? "Only the board owner can do that"
              : "You have view-only access to this board",
        });
      }

      req.board = board;
      req.boardRole = role;
      next();
    } catch (err) {
      console.error("[permissions] checkAccess failed:", err);
      res.status(500).json({ error: "Could not check board access" });
    }
  };
}

/* ------------------------------------------------------------------ */
/* Share links                                                         */
/* ------------------------------------------------------------------ */

// Creates (or reuses) the board's invite token for the given role
export async function generateShareLink(boardId, role = "viewer") {
  const shareRole = role === "editor" ? "editor" : "viewer";
  const board = await Board.findById(boardId).select("shareToken shareRole");
  if (!board) return null;

  if (board.shareToken && board.shareRole === shareRole) {
    return { token: board.shareToken, role: shareRole };
  }

  const token = crypto.randomBytes(18).toString("hex");
  await Board.updateOne({ _id: boardId }, { $set: { shareToken: token, shareRole } });
  return { token, role: shareRole };
}

export async function createShareLink(req, res) {
  try {
    const link = await generateShareLink(req.board._id, req.body?.role);
    if (!link) return res.status(404).json({ error: "Board not found" });
    res.status(201).json({ share: link });
  } catch (err) {
    console.error("[permissions] createShareLink failed:", err);
    res.status(500).json({ error: "Could not create share link" });
  }
}

export async function revokeShareLink(req, res) {
  try {
    await Board.updateOne({ _id: req.board._id }, { $unset: { shareToken: 1 } });
    res.json({ ok: true });
  } catch (err) {
    console.error("[permissions] revokeShareLink failed:", err);
    res.status(500).json({ error: "Could not revoke share link" });
  }
}

// Someone opened an invite link: give them the link's role on the board
export async function joinBoardByToken(req, res) {
  try {
    const { token } = req.params;
    if (!TOKEN_PATTERN.test(token)) {
      return res.status(404).json({ error: "This invite link is not valid any more" });
    }

    const board = await Board.findOne({ shareToken: token }).select("-canvasJSON");
    if (!board) {
      return res.status(404).json({ error: "This invite link is not valid any more" });
    }

    const current = getUserRole(board, req.userId);

    if (!current) {
      // $ne makes this safe if the same person opens the link twice at once
      await Board.updateOne(
        { _id: board._id, "members.userId": { $ne: req.userId } },
        { $push: { members: { userId: req.userId, role: board.shareRole } } }
      );
      return res.json({ boardId: board._id, role: board.shareRole });
    }

    // Already has access. An editor link upgrades a viewer, nothing ever downgrades.
    if (current === "viewer" && board.shareRole === "editor") {
      await Board.updateOne(
        { _id: board._id, "members.userId": req.userId },
        { $set: { "members.$.role": "editor" } }
      );
      await refreshSocketAccess(req.app.get("io"), board._id, req.userId);
      return res.json({ boardId: board._id, role: "editor" });
    }

    res.json({ boardId: board._id, role: current });
  } catch (err) {
    console.error("[permissions] joinBoardByToken failed:", err);
    res.status(500).json({ error: "Could not join board" });
  }
}

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

// Owner view: who has access + the current invite link
export async function listMembers(req, res) {
  try {
    const board = await Board.findById(req.board._id)
      .select("ownerId members shareToken shareRole")
      .populate("ownerId", "name email")
      .populate("members.userId", "name email")
      .lean();
    if (!board) return res.status(404).json({ error: "Board not found" });

    const owner = board.ownerId
      ? { id: board.ownerId._id, name: board.ownerId.name, email: board.ownerId.email }
      : null;

    const members = (board.members || [])
      .filter((m) => m.userId && m.userId._id)
      .map((m) => ({
        userId: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        role: m.role,
      }));

    const share = board.shareToken
      ? { token: board.shareToken, role: board.shareRole }
      : null;

    res.json({ owner, members, share });
  } catch (err) {
    console.error("[permissions] listMembers failed:", err);
    res.status(500).json({ error: "Could not load members" });
  }
}

// Sets a member's role. role = "viewer" | "editor" | "owner" (owner = transfer ownership)
// Returns "ok" | "invalid-role" | "not-member" | "not-found"
export async function setBoardPermission(boardId, userId, role) {
  if (!["viewer", "editor", "owner"].includes(role)) return "invalid-role";

  const board = await Board.findById(boardId).select("-canvasJSON");
  if (!board) return "not-found";

  const target = board.members.find((m) => String(m.userId) === String(userId));
  if (!target) return "not-member";

  if (role === "owner") {
    const previousOwner = board.ownerId;
    board.members = board.members.filter((m) => String(m.userId) !== String(userId));
    board.members.push({ userId: previousOwner, role: "editor" });
    board.ownerId = target.userId;
    await board.save();
    return "ok";
  }

  await Board.updateOne(
    { _id: boardId, "members.userId": userId },
    { $set: { "members.$.role": role } }
  );
  return "ok";
}

export async function updateMemberRole(req, res) {
  try {
    const { userId } = req.params;
    const role = req.body?.role;
    if (!isValidId(userId)) return res.status(404).json({ error: "Member not found" });

    const result = await setBoardPermission(req.board._id, userId, role);
    if (result === "invalid-role") {
      return res.status(400).json({ error: "role must be viewer, editor or owner" });
    }
    if (result !== "ok") return res.status(404).json({ error: "Member not found" });

    const io = req.app.get("io");
    await refreshSocketAccess(io, req.board._id, userId);
    if (role === "owner") await refreshSocketAccess(io, req.board._id, req.userId);

    res.json({ ok: true });
  } catch (err) {
    console.error("[permissions] updateMemberRole failed:", err);
    res.status(500).json({ error: "Could not update permission" });
  }
}

// The owner can remove anyone; any member can remove themselves (leave the board)
export async function removeMember(req, res) {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(404).json({ error: "Member not found" });

    if (req.boardRole !== "owner" && userId !== req.userId) {
      return res.status(403).json({ error: "Only the board owner can remove other people" });
    }
    if (String(req.board.ownerId) === userId) {
      return res.status(400).json({ error: "The owner can't be removed. Delete the board instead." });
    }

    await Board.updateOne({ _id: req.board._id }, { $pull: { members: { userId } } });
    await refreshSocketAccess(req.app.get("io"), req.board._id, userId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[permissions] removeMember failed:", err);
    res.status(500).json({ error: "Could not remove member" });
  }
}