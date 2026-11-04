import { useEffect, useRef, useState } from "react";
import "./ChatPanel.css";

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPanel({
  messages,
  myUserId,
  connected,
  onSend,
  onClose,
}) {
  const [text, setText] = useState("");
  const listEndRef = useRef(null);

  // Always scroll to the newest message
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !connected) return;
    if (onSend(trimmed)) setText("");
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-title">Board chat</span>
        <button
          type="button"
          className="chat-close-btn"
          aria-label="Close chat"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">No messages yet. Say hi 👋</p>
        )}

        {messages.map((m) => {
          const mine = m.userId === myUserId;
          return (
            <div key={m.id} className={`chat-message${mine ? " mine" : ""}`}>
              <div className="chat-meta">
                {!mine && <span className="chat-author">{m.userName}</span>}
                <span className="chat-time">{formatTime(m.createdAt)}</span>
              </div>
              <div className="chat-bubble">{m.text}</div>
            </div>
          );
        })}
        <div ref={listEndRef} />
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder={connected ? "Type a message…" : "Offline…"}
          value={text}
          maxLength={1000}
          disabled={!connected}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!connected || !text.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}