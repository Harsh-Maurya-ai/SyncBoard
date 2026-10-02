import { useCallback, useEffect, useState } from "react";
import {
  createShareLink,
  listMembers,
  removeMember,
  revokeShareLink,
  setMemberRole,
} from "../api/client";
import "./ShareDialog.css";

// Owner-only popup: create / revoke the invite link and manage who has access
export default function ShareDialog({ boardId, onClose }) {
  const [data, setData] = useState(null); // { owner, members, share }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkRole, setLinkRole] = useState("viewer");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await listMembers(boardId);
      setData(result);
      if (result.share) setLinkRole(result.share.role);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [boardId]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs an API call, then refreshes the list. Returns true if it worked.
  const run = async (action, { reload = true } = {}) => {
    setBusy(true);
    setError("");
    try {
      await action();
      if (reload) await load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const link = data?.share
    ? `${window.location.origin}/join/${data.share.token}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it.");
    }
  };

  const handleRoleChange = async (member, role) => {
    if (
      role === "owner" &&
      !window.confirm(`Make ${member.name} the owner? You will become an editor.`)
    ) {
      return;
    }
    const ok = await run(() => setMemberRole(boardId, member.userId, role), {
      reload: role !== "owner", // after a transfer we are no longer allowed to list members
    });
    if (ok && role === "owner") onClose();
  };

  const handleRemove = (member) => {
    if (!window.confirm(`Remove ${member.name} from this board?`)) return;
    run(() => removeMember(boardId, member.userId));
  };

  return (
    <div className="share-overlay" onMouseDown={onClose}>
      <div className="share-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="share-header">
          <h2>Share board</h2>
          <button type="button" className="share-close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <p className="share-error">{error}</p>}

        <section className="share-section">
          <h3>Invite link</h3>
          <p className="share-hint">
            Anyone with the link who is logged in gets access with the role below.
          </p>

          {data?.share ? (
            <>
              <div className="share-row">
                <input className="share-link" readOnly value={link} onFocus={(e) => e.target.select()} />
                <button type="button" className="share-btn" onClick={handleCopy}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="share-row">
                <span className="share-hint">
                  Link role: <strong>{data.share.role}</strong>
                </span>
                <button
                  type="button"
                  className="share-btn danger"
                  disabled={busy}
                  onClick={() => run(() => revokeShareLink(boardId))}
                >
                  Turn link off
                </button>
              </div>
            </>
          ) : (
            <div className="share-row">
              <select
                className="share-select"
                value={linkRole}
                onChange={(e) => setLinkRole(e.target.value)}
              >
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
              </select>
              <button
                type="button"
                className="share-btn primary"
                disabled={busy || !data}
                onClick={() => run(() => createShareLink(boardId, linkRole))}
              >
                Create link
              </button>
            </div>
          )}
        </section>

        <section className="share-section">
          <h3>People with access</h3>

          {!data ? (
            <p className="share-hint">Loading…</p>
          ) : (
            <ul className="share-members">
              {data.owner && (
                <li className="share-member">
                  <span className="share-member-name">
                    {data.owner.name} <small>{data.owner.email}</small>
                  </span>
                  <span className="share-member-role">owner</span>
                </li>
              )}

              {data.members.length === 0 && (
                <li className="share-hint">No one else has joined yet.</li>
              )}

              {data.members.map((member) => (
                <li key={member.userId} className="share-member">
                  <span className="share-member-name">
                    {member.name} <small>{member.email}</small>
                  </span>
                  <select
                    className="share-select"
                    value={member.role}
                    disabled={busy}
                    onChange={(e) => handleRoleChange(member, e.target.value)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="owner">Make owner</option>
                  </select>
                  <button
                    type="button"
                    className="share-btn danger"
                    disabled={busy}
                    onClick={() => handleRemove(member)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}