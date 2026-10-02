import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { createBoard, deleteBoard, listBoards, renameBoard } from "../api/client";
import "./Dashboard.css";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const loadBoards = useCallback(async () => {
    try {
      const data = await listBoards();
      setBoards(data.boards);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const data = await createBoard(newTitle.trim() || "Untitled board");
      navigate(`/board/${data.board._id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  const handleRename = async (board) => {
    const title = window.prompt("Rename board", board.title);
    if (title === null || !title.trim() || title.trim() === board.title) return;
    try {
      await renameBoard(board._id, title.trim());
      await loadBoards();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (board) => {
    if (!window.confirm(`Delete "${board.title}"? This can't be undone.`)) return;
    try {
      await deleteBoard(board._id);
      await loadBoards();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-logo">SyncBoard</h1>
        <div className="dashboard-user">
          <span>{user?.name}</span>
          <button type="button" className="dashboard-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <form className="dashboard-create" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New board title"
            value={newTitle}
            maxLength={100}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button type="submit" className="dashboard-btn primary" disabled={creating}>
            {creating ? "Creating…" : "Create board"}
          </button>
        </form>

        {error && <p className="dashboard-error">{error}</p>}

        <h2 className="dashboard-heading">Your boards</h2>

        {loading ? (
          <p className="dashboard-empty">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="dashboard-empty">
            No boards yet. Create one above to get started.
          </p>
        ) : (
          <ul className="dashboard-grid">
            {boards.map((board) => (
              <li key={board._id} className="dashboard-card">
                <Link to={`/board/${board._id}`} className="dashboard-card-link">
                  <span className="dashboard-card-title">{board.title}</span>
                  <span className={`dashboard-badge ${board.role}`}>{board.role}</span>
                </Link>
                <p className="dashboard-card-meta">
                  {board.role === "owner" ? "Owned by you" : `Owned by ${board.ownerName}`}
                  <br />
                  Updated {formatDate(board.updatedAt)}
                </p>
                {board.role === "owner" && (
                  <div className="dashboard-card-actions">
                    <button
                      type="button"
                      className="dashboard-btn"
                      onClick={() => handleRename(board)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="dashboard-btn danger"
                      onClick={() => handleDelete(board)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}