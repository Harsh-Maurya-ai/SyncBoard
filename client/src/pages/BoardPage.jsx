import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Whiteboard from "../components/Whiteboard";
import { fetchBoard } from "../api/client";

// Loads the board (title, your role, saved canvas) before showing the editor
export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ boardId: null, board: null, error: "" });

  useEffect(() => {
    let cancelled = false;

    fetchBoard(boardId)
      .then((data) => {
        if (!cancelled) setState({ boardId, board: data.board, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setState({ boardId, board: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Still waiting for the board that matches the current URL
  if (state.boardId !== boardId) {
    return <div className="page-message">Loading board…</div>;
  }

  if (state.error) {
    return (
      <div className="page-message">
        <p>{state.error}</p>
        <Link to="/">Back to my boards</Link>
      </div>
    );
  }

  return (
    <Whiteboard
      key={state.board._id}
      board={state.board}
      onBack={() => navigate("/")}
    />
  );
}