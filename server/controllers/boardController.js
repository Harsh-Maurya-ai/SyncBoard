import Board from "../models/Board.js";

// Creates a new board owned by the current user
export async function createBoard(req, res) {
  try {
    const title = (req.body?.title || "Untitled board").trim();
    const board = await Board.create({ title, ownerId: req.userId });
    res.status(201).json({ board });
  } catch (err) {
    console.error("[board] createBoard failed:", err);
    res.status(500).json({ error: "Could not create board" });
  }
}

// Fetches a board's saved JSON state
export async function getBoardById(req, res) {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (board.ownerId.toString() !== req.userId) {
      return res.status(403).json({ error: "You don't have access to this board" });
    }

    res.json({ board });
  } catch (err) {
    console.error("[board] getBoardById failed:", err);
    res.status(500).json({ error: "Could not load board" });
  }
}