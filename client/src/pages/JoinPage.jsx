import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { joinBoardByToken } from "../api/client";

// /join/:token  ->  adds you to the board with the link's role, then opens it
export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    joinBoardByToken(token)
      .then((data) => {
        if (!cancelled) navigate(`/board/${data.boardId}`, { replace: true });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  if (error) {
    return (
      <div className="page-message">
        <p>{error}</p>
        <Link to="/">Back to my boards</Link>
      </div>
    );
  }
  return <div className="page-message">Joining board…</div>;
}