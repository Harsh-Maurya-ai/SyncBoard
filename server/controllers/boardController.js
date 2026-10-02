import Board from "../models/Board.js";
import { getUserRole } from "../utils/access.js";
import { refreshSocketAccess } from "../socket/accessSync.js";

const MAX_TITLE_LENGTH = 100;

// Creates a new board owned by the current user
export async function createBoard(req, res) {
  try {
    const title = String(req.body?.title || "Untitled board")
      .trim()
      .slice(0, MAX_TITLE_LENGTH);
    const board = await Board.create({
      title: title || "Untitled board",
      ownerId: req.userId,
    });
    res.status(201).json({
      board: { _id: board._id, title: board.title, role: "owner" },
    });
  } catch (err) {
    console.error("[board] createBoard failed:", err);
    res.status(500).json({ error: "Could not create board" });
  }
}

// Fetches a board's saved JSON state (access was already checked by checkAccess)
export async function getBoardById(req, res) {
  try {
    const full = await Board.findById(req.board._id).select("canvasJSON").lean();
    res.json({
      board: {
        _id: req.board._id,
        title: req.board.title,
        role: req.boardRole,
        canvasJSON: full?.canvasJSON ?? null,
        updatedAt: req.board.updatedAt,
      },
    });
  } catch (err) {
    console.error("[board] getBoardById failed:", err);
    res.status(500).json({ error: "Could not load board" });
  }
}

// Persists the current canvas JSON to MongoDB. Returns false if the board is gone.
export async function saveBoardState(boardId, canvasJSON) {
  const valid =
    canvasJSON && typeof canvasJSON === "object" && Array.isArray(canvasJSON.objects);
  if (!valid) throw new Error("Invalid canvas data");

  const result = await Board.updateOne({ _id: boardId }, { $set: { canvasJSON } });
  return result.matchedCount > 0;
}

// PUT /api/boards/:id/state  (editors and owners)
export async function saveBoard(req, res) {
  try {
    const canvasJSON = req.body?.canvasJSON;
    const valid =
      canvasJSON && typeof canvasJSON === "object" && Array.isArray(canvasJSON.objects);
    if (!valid) return res.status(400).json({ error: "canvasJSON with an objects array is required" });

    const saved = await saveBoardState(req.board._id, canvasJSON);
    if (!saved) return res.status(404).json({ error: "Board not found" });

    res.json({ savedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[board] saveBoard failed:", err);
    res.status(500).json({ error: "Could not save board" });
  }
}

// Every board the user owns or was invited to (without the heavy canvas data)
export async function listUserBoards(req, res) {
  try {
    const boards = await Board.find({
      $or: [{ ownerId: req.userId }, { "members.userId": req.userId }],
    })
      .select("-canvasJSON")
      .populate("ownerId", "name")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      boards: boards.map((b) => ({
        _id: b._id,
        title: b.title,
        role: getUserRole(b, req.userId),
        ownerName: b.ownerId?.name || "Unknown",
        updatedAt: b.updatedAt,
        createdAt: b.createdAt,
      })),
    });
  } catch (err) {
    console.error("[board] listUserBoards failed:", err);
    res.status(500).json({ error: "Could not load your boards" });
  }
}

// Removes a board (owner only) and kicks anyone still connected to it
export async function deleteBoard(req, res) {
  try {
    await Board.deleteOne({ _id: req.board._id });
    await refreshSocketAccess(req.app.get("io"), req.board._id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[board] deleteBoard failed:", err);
    res.status(500).json({ error: "Could not delete board" });
  }
}

// Updates the board title (owner only)
export async function renameBoard(req, res) {
  try {
    const title = String(req.body?.title || "").trim().slice(0, MAX_TITLE_LENGTH);
    if (!title) return res.status(400).json({ error: "Title can't be empty" });

    await Board.updateOne({ _id: req.board._id }, { $set: { title } });
    res.json({ board: { _id: req.board._id, title } });
  } catch (err) {
    console.error("[board] renameBoard failed:", err);
    res.status(500).json({ error: "Could not rename board" });
  }
}